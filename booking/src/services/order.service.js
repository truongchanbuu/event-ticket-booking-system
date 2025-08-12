export class OrderService {
    constructor({ db, logger = console } = {}) {
        if (!db) throw new Error("FIRESTORE_REQUIRED");
        this.db = db;
        this.logger = logger;

        // Collections
        this.ordersCol = this.db.collection("orders");
        this.ticketsCol = this.db.collection("tickets");
        this.ledgerCol = this.db.collection("reservation_commits");
    }

    deriveOrderId(reservationId) {
        return `ORD_${reservationId}`;
    }

    async createFromReservation(hold, opts = {}) {
        this._validateHold(hold);

        const reservationId = String(hold.reservationId);
        const orderId = this.deriveOrderId(reservationId);
        const ledgerRef = this.ledgerCol.doc(reservationId);
        const orderRef = this.ordersCol.doc(orderId);

        const {
            amount = undefined,
            currency = "VND",
            paymentIntentId = undefined,
            maxWritesPerTxn = 400,
        } = opts;

        const items = this._itemsFromLines(hold.lines);
        const ticketPlan = this._expandTicketPlan(orderId, hold);
        const ticketCount = ticketPlan.length;

        // Chunk sizing: keep a margin of 10 writes (order + ledger, retries, etc.)
        const chunkCapacity = Math.max(1, Number(maxWritesPerTxn || 400) - 10);
        const chunks = this._chunkArray(ticketPlan, chunkCapacity);
        const chunkCount = chunks.length;

        this.logger.info(`[OrderService] commit start`, {
            reservationId,
            orderId,
            ticketCount,
            chunkCapacity,
            chunks: chunkCount,
            maxWritesPerTxn,
        });
        if (chunkCount > 1) {
            this.logger.warn(
                `[OrderService] chunking into ${chunkCount} transactions for reservationId=${reservationId} (tickets=${ticketCount})`,
            );
        }

        // Prebuild order payload; createdAt/updatedAt stamped at create-time.
        const baseOrderDoc = this._buildOrderDoc(hold, {
            orderId,
            items,
            amount,
            currency,
            paymentIntentId,
        });

        let already = false;
        let executedTxns = 0;

        // Process chunks sequentially. The final chunk will also attempt to write the ledger.
        for (let i = 0; i < chunkCount; i++) {
            const isLast = i === chunkCount - 1;
            const planSlice = chunks[i];

            const res = await this._commitSingleTxn({
                orderRef,
                ledgerRef,
                baseOrderDoc,
                planSlice,
                isLast,
            });

            executedTxns += 1;
            if (res.already) {
                already = true;
                break; // Ledger existed or got created by a concurrent committer
            }
        }

        this.logger.info(`[OrderService] commit done`, {
            reservationId,
            orderId,
            ticketCount,
            already,
            txns: executedTxns,
        });

        return { orderId, already, ticketCount };
    }

    /* ==========================
     * Private helpers
     * ========================== */
    _validateHold(hold) {
        if (!hold || typeof hold !== "object")
            throw new Error("INVALID_HOLD_PAYLOAD");
        const { reservationId, eventId, lines } = hold;

        if (!reservationId || typeof reservationId !== "string") {
            throw new Error("INVALID_HOLD_PAYLOAD");
        }
        if (!eventId || typeof eventId !== "string") {
            throw new Error("INVALID_HOLD_PAYLOAD");
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new Error("INVALID_HOLD_PAYLOAD");
        }
        for (const ln of lines) {
            if (
                !ln ||
                typeof ln !== "object" ||
                !ln.ttId ||
                typeof ln.ttId !== "string" ||
                !Number.isInteger(ln.qty) ||
                ln.qty < 1
            ) {
                throw new Error("INVALID_HOLD_PAYLOAD");
            }
        }
    }

    _buildOrderDoc(hold, meta) {
        const nowIso = new Date().toISOString();
        return {
            orderId: meta.orderId,
            reservationId: hold.reservationId,
            eventId: hold.eventId,
            userId: hold.userId ?? null,
            status: "PAID", // payment already confirmed
            amount: typeof meta.amount === "number" ? meta.amount : null,
            currency: meta.currency || "VND",
            paymentIntentId: meta.paymentIntentId ?? null,
            items: meta.items,
            createdAt: nowIso,
            updatedAt: nowIso,
        };
    }

    _itemsFromLines(lines) {
        return lines.map((l) => ({ ticketTypeId: l.ttId, qty: l.qty }));
    }

    _ticketId(orderId, ttId, seq) {
        return `${orderId}:${ttId}:${seq}`;
    }

    _expandTicketPlan(orderId, hold) {
        /** @type {Array<{ticketId:string, ttId:string}>} */
        const plan = [];
        for (const line of hold.lines) {
            for (let i = 1; i <= line.qty; i++) {
                plan.push({
                    ticketId: this._ticketId(orderId, line.ttId, i),
                    ttId: line.ttId,
                });
            }
        }
        return plan;
    }

    /**
     * Chunk an array into consecutive slices of size n.
     * @template T
     * @param {T[]} arr
     * @param {number} n
     * @returns {T[][]}
     */
    _chunkArray(arr, n) {
        const out = [];
        if (arr.length === 0) return out;
        for (let i = 0; i < arr.length; i += n) {
            out.push(arr.slice(i, i + n));
        }
        return out;
    }

    _buildTicketDoc({ ticketId, orderId, eventId, userId, ttId }) {
        return {
            ticketId,
            orderId,
            eventId,
            ticketTypeId: ttId,
            ownerId: userId ?? null,
            status: "ISSUED",
            issuedAt: new Date().toISOString(),
        };
    }

    async _commitSingleTxn({
        orderRef,
        ledgerRef,
        baseOrderDoc,
        planSlice,
        isLast,
    }) {
        return this.db.runTransaction(async (tx) => {
            // Idempotency check
            const ledgerSnap = await tx.get(ledgerRef);
            if (ledgerSnap.exists) {
                return { already: true };
            }

            // Ensure order exists (create-only). We avoid extra update writes.
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists) {
                tx.create(orderRef, this._clone(baseOrderDoc));
            }

            // Prepare ticket refs and read existence
            const tRefs = planSlice.map((t) => this.ticketsCol.doc(t.ticketId));

            // Read all ticket docs within the transaction
            const tSnaps = await Promise.all(tRefs.map((ref) => tx.get(ref)));

            // Create missing tickets
            for (let i = 0; i < tRefs.length; i++) {
                if (!tSnaps[i].exists) {
                    const ref = tRefs[i];
                    const { ticketId, ttId } = planSlice[i];
                    const orderId = orderRef.id; // our order doc id equals orderId
                    const [eventId, userId] = [
                        orderSnap.exists
                            ? orderSnap.data().eventId
                            : baseOrderDoc.eventId,
                        orderSnap.exists
                            ? (orderSnap.data().userId ?? null)
                            : (baseOrderDoc.userId ?? null),
                    ];
                    const doc = this._buildTicketDoc({
                        ticketId,
                        orderId,
                        eventId,
                        userId,
                        ttId,
                    });
                    tx.create(ref, doc);
                }
            }

            // Only the final chunk writes the ledger marker
            if (isLast) {
                // Double-check before create; tx will retry if a concurrent txn inserts it between reads and commit.
                const finalLedgerSnap = await tx.get(ledgerRef);
                if (!finalLedgerSnap.exists) {
                    tx.create(ledgerRef, {
                        orderId: orderRef.id,
                        createdAt: new Date().toISOString(),
                    });
                }
            }

            return { already: false };
        });
    }

    _clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
