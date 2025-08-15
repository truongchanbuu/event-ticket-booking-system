export class OrderController {
    constructor({ orderService }) {
        this.orderService = orderService;
    }

    getOrderByClaim = async (req, res) => {
        const started = Date.now();
        try {
            const oid = String(req.query.oid || "");
            const token = String(req.query.t || "");
            if (!oid || !token) {
                return res
                    .status(400)
                    .json({ ok: false, error: "BAD_REQUEST" });
            }

            const out = await orderService.getOrderWithTicketsByClaim(
                oid,
                token,
            );
            if (!out.ok) {
                const map = {
                    ORDER_NOT_FOUND: 404,
                    CLAIM_NOT_SET: 404,
                    CLAIM_EXPIRED: 403,
                    CLAIM_INVALID: 403,
                    BAD_REQUEST: 400,
                };
                const code = map[out.error] ?? 400;
                return res.status(code).json({ ok: false, error: out.error });
            }

            return res.json({
                ok: true,
                order: out.order,
                tickets: out.tickets,
            });
        } catch (e) {
            console.log("[/orders/claim] error", { e: e?.message });
            return res.status(500).json({ ok: false, error: "INTERNAL" });
        } finally {
            console.log("[/orders/claim] done", {
                durMs: Date.now() - started,
            });
        }
    };
}
