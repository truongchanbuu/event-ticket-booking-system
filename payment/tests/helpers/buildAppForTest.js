import express from "express";
import bodyParser from "body-parser";

/**
 * @param {{ svc:any }} deps
 * @returns {{ app: import('express').Express }}
 */
export function buildAppForTest({ svc }) {
    const app = express();
    app.use(bodyParser.json());

    // Minimal internal route: /internal/payment/confirm
    app.post("/internal/payment/confirm", async (req, res) => {
        try {
            const data = await svc.confirmByIntent({
                paymentIntentID: req.body?.paymentIntentID,
                reservationID: req.body?.reservationID,
                refresh: Boolean(req.body?.refresh),
            });
            return res.status(200).json({
                success: true,
                message: "Payment confirmation checked",
                data,
            });
        } catch (err) {
            const status = err?.statusCode || 500;
            return res.status(status).json({
                success: false,
                message: err?.message || "INTERNAL_ERROR",
                errorCode: err?.errorCode || "INTERNAL_ERROR",
                statusCode: status,
                data: null,
            });
        }
    });

    return { app };
}
