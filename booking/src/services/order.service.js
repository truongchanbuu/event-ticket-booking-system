import crypto from "node:crypto";
import { createHash, timingSafeEqual } from "node:crypto";
export class OrderService {
    constructor({ db, logger = console } = {}) {
        if (!db) throw new Error("FIRESTORE_REQUIRED");
        this.db = db;
        this.logger = logger;

        // Collections
        this.ordersCol = this.db.collection("orders");
        this.ticketsCol = this.db.collection("tickets");
        this.ledgerCol = this.db.collection("reservation_commits");

        this.claimTtlMs = 30 * 24 * 3600 * 1000;
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
            claimTtlMs = this.claimTtlMs,
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

        const claimToken = this._randTokenHex(24);
        const claimTokenHash = this._sha256Hex(claimToken);
        const claimExpiresAt = Date.now() + Number(claimTtlMs);

        // Prebuild order payload; createdAt/updatedAt stamped at create-time.
        const baseOrderDoc = this._buildOrderDoc(hold, {
            orderId,
            items,
            amount,
            currency,
            paymentIntentId,
            claimTokenHash,
            claimExpiresAt,
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

        return {
            orderId,
            already,
            ticketCount,
            claimToken: already ? null : claimToken,
            claimExpiresAt,
        };
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
            claim: {
                tokenHash: meta.claimTokenHash, // sha256 hex
                expiresAt: meta.claimExpiresAt, // ms epoch
                rotated: false,
            },
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

    _randTokenHex(bytes = 24) {
        return crypto.randomBytes(bytes).toString("hex");
    }
    _sha256Hex(s) {
        return createHash("sha256").update(String(s)).digest("hex");
    }
    _tsEqHex(a, b) {
        const ab = Buffer.from(String(a), "utf8");
        const bb = Buffer.from(String(b), "utf8");
        if (ab.length !== bb.length) return false;
        return timingSafeEqual(ab, bb);
    }

    async getOrderWithTicketsByClaim(orderId, claimToken) {
        if (!orderId || !claimToken) return { ok: false, error: "BAD_REQUEST" };

        const orderRef = this.ordersCol.doc(String(orderId));
        const snap = await orderRef.get();
        if (!snap.exists) return { ok: false, error: "ORDER_NOT_FOUND" };
        const o = snap.data();

        const exp = Number(o?.claim?.expiresAt || 0);
        const hash = o?.claim?.tokenHash || "";
        if (!hash) return { ok: false, error: "CLAIM_NOT_SET" };
        if (exp && exp < Date.now())
            return { ok: false, error: "CLAIM_EXPIRED" };

        const okHash = this._tsEqHex(hash, this._sha256Hex(claimToken));
        if (!okHash) return { ok: false, error: "CLAIM_INVALID" };

        // Lấy tickets theo orderId
        const tSnap = await this.ticketsCol
            .where("orderId", "==", orderId)
            .get();
        const tickets = tSnap.docs.map((d) => d.data());

        // Mask buyer khi trả về qua claim (tránh lộ PII)
        const buyer = this._maskBuyer(o?.buyer || null);

        return {
            ok: true,
            order: {
                orderId: o.orderId,
                eventId: o.eventId,
                status: o.status,
                amount: o.amount,
                currency: o.currency,
                items: o.items,
                buyer, // masked
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
            },
            tickets,
        };
    }

    _maskBuyer(b) {
        if (!b) return null;
        const maskEmail = (e) =>
            typeof e === "string" ? e.replace(/(^.).*(@.*$)/, "$1***$2") : null;
        const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
        const maskPhone = (p) => {
            const d = onlyDigits(p);
            if (!d) return null;
            const last4 = d.slice(-4);
            return `***-***-${last4}`;
        };
        return {
            name: b.name ?? null,
            email: b.email ? maskEmail(b.email) : null,
            phone: b.phone ? maskPhone(b.phone) : null,
        };
    }
}
