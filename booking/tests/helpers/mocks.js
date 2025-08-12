export class EventInventoryMock {
    constructor(remainsByTt = {}) {
        this.rem = new Map(
            Object.entries(remainsByTt).map(([k, v]) => [k, Number(v)]),
        );
    }
    async reserve(ttId, { qty }) {
        const cur = this.rem.get(ttId) ?? 0;
        if (cur < qty) return { ok: false, currentRemaining: cur };
        this.rem.set(ttId, cur - qty);
        return { ok: true, shardIndex: 0, version: 1, newRemaining: cur - qty };
    }
    async release(ttId, { qty }) {
        const cur = this.rem.get(ttId) ?? 0;
        this.rem.set(ttId, cur + qty);
        return { ok: true, newRemaining: cur + qty, version: 1 };
    }
    remaining(ttId) {
        return this.rem.get(ttId) ?? 0;
    }
}

export class PaymentClientMock {
    constructor() {
        this._statusByRes = new Map();
    }
    set(reservationID, status, extra = {}) {
        this._statusByRes.set(reservationID, { status, ...extra });
    }
    async confirm({ reservationID }) {
        const d = this._statusByRes.get(reservationID);
        if (!d)
            return {
                success: false,
                message: "NOT_FOUND",
                statusCode: 404,
                data: null,
            };
        return {
            success: true,
            message: "OK",
            data: {
                paymentIntentID: d.paymentIntentID || "pi_test",
                reservationID,
                provider: d.provider || "momo",
                status: d.status,
                confirmed: d.status === "SUCCEEDED",
                refreshed: false,
                source: "cache",
                amount: d.amount ?? 1000,
                currency: d.currency ?? "VND",
            },
        };
    }
}

export class OrderServiceMock {
    constructor() {
        this.calls = [];
    }
    async createFromReservation(hold, opts = {}) {
        this.calls.push({ hold, opts });
        const ticketCount = (hold.lines || []).reduce((s, l) => s + l.qty, 0);
        return {
            orderId: `ORD_${hold.reservationId}`,
            already: false,
            ticketCount,
        };
    }
}

export class ReservationProducerMock {
    constructor() {
        this.sent = [];
    }
    async sendReservationCreated(p, m, h) {
        this.sent.push(["created", p, m, h]);
    }
    async sendReservationCancelled(p, m, h) {
        this.sent.push(["cancelled", p, m, h]);
    }
    async sendReservationCommitted(p, m, h) {
        this.sent.push(["committed", p, m, h]);
    }
}
