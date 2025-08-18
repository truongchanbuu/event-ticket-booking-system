import express from "express";
import crypto from "node:crypto";
import {
    getIntentIdemCached,
    setIntentIdemPending,
    setIntentIdemFinal,
} from "../utils/payment-intent.utils.js";

export default class PaymentIntentRouter {
    /**
     * @param {{
     *   redisService: any,                // dùng wrapper có get/set/setNXEx
     *   paymentService: any,              // PaymentService
     *   logger?: Console,
     *   config?: {
     *     intentTtlMs?: number,           // TTL QR/intent (ms)
     *     statusTtlSec?: number,          // TTL cache TX trong Redis (s)
     *     publicBaseUrl?: string,
     *     hmacKey?: string,
     *     mockSuccessRate?: number,
     *     providerMap?: Record<string,string>,
     *     idemPadSec?: number,            // pad TTL cho idem
     *   }
     * }} deps
     */
    constructor({
        redisService,
        paymentService,
        logger = console,
        config = {},
    }) {
        if (!redisService)
            throw new Error("[PaymentIntentRouter] redisService is required");
        if (!paymentService)
            throw new Error("[PaymentIntentRouter] paymentService is required");

        this.redis = redisService;
        this.paymentService = paymentService;
        this.logger = logger;

        this.intentTtlMs = Number(config.intentTtlMs ?? 3 * 60 * 1000); // 3 phút
        this.statusTtlSec = Number(config.statusTtlSec ?? 10 * 60); // 10 phút
        this.publicBaseUrl =
            config.publicBaseUrl ||
            process.env.PUBLIC_BASE_URL ||
            "http://localhost:3006/api";
        this.hmacKey =
            config.hmacKey || process.env.MOCKPAY_HMAC || "dev-secret";
        this.mockSuccessRate = Number(
            config.mockSuccessRate ?? process.env.MOCKPAY_SUCCESS_RATE ?? 0.8,
        );
        this.idemPadSec = Number(config.idemPadSec ?? 60);

        let envMap = {};
        try {
            envMap = JSON.parse(process.env.PAYMENT_PROVIDER_MAP || "{}");
        } catch {}
        this.providerMap = Object.assign({}, envMap, config.providerMap || {});

        this.router = express.Router();
        this.initRoutes();
    }

    // ===== Helpers =====
    _sign(payload) {
        const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
        const mac = crypto
            .createHmac("sha256", this.hmacKey)
            .update(b)
            .digest("base64url");
        return `${b}.${mac}`;
    }
    _verify(token) {
        const [b, mac] = String(token || "").split(".");
        const mac2 = crypto
            .createHmac("sha256", this.hmacKey)
            .update(b)
            .digest("base64url");
        if (mac !== mac2) throw new Error("BAD_TOKEN");
        return JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    }
    async _get(key) {
        const raw = await this.redis.get(key);

        if (raw == null) {
            return null;
        }
        if (typeof raw === "object") {
            return raw;
        }

        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }

    async _set(key, obj, ttlSec = this.statusTtlSec) {
        // Nếu redisService.set chấp nhận object và tự stringify -> giữ nguyên.
        // Nếu nó yêu cầu string, thì làm rõ:
        const payload = typeof obj === "string" ? obj : JSON.stringify(obj);
        await this.redis.set(key, payload, { ttl: ttlSec });
    }

    // ===== Handlers =====

    // POST /payments/intents
    _postCreateIntent = async (req, res) => {
        const idemKey = req.get("Idempotency-Key") || null;

        try {
            const {
                rid,
                reservationID: rid2,
                reservationId,
                buyerClaim,
                provider: pRaw,
                ttlMs,
            } = req.body || {};
            const reservationID = String(
                rid || rid2 || reservationId || "",
            ).trim();

            if (!reservationID) {
                return res.status(400).json({
                    success: false,
                    message: "reservationID (rid) required",
                });
            }

            let provider = String(pRaw || "").trim();
            if (!provider) {
                return res
                    .status(400)
                    .json({ success: false, error: "PROVIDER_REQUIRED" });
            }

            const providerOriginal = provider;
            if (this.providerMap[provider])
                provider = String(this.providerMap[provider]);

            // --- IDEMPOTENCY (riêng cho payment-intent) ---
            if (idemKey) {
                const cached = await getIntentIdemCached(this.redis, idemKey);
                if (cached?.status === "done") {
                    return res
                        .status(cached.statusCode || 200)
                        .json(cached.body);
                }

                if (cached?.status === "pending") {
                    return res.status(409).json({
                        success: false,
                        error: "IDEMPOTENCY_PENDING",
                    });
                }
                const ttlBaseSec = Math.ceil(
                    (Number(ttlMs) || this.intentTtlMs) / 1000,
                );
                const latch = await setIntentIdemPending(this.redis, idemKey, {
                    ttlBaseSec,
                    ttlPadSec: this.idemPadSec,
                });
                if (latch !== "OK") {
                    return res.status(409).json({
                        success: false,
                        error: "IDEMPOTENCY_PENDING",
                    });
                }
            }

            const intentId = `PI_${crypto.randomUUID()}`;
            const txId = `TX_${crypto.randomUUID()}`;
            const expiresAt = Date.now() + (Number(ttlMs) || this.intentTtlMs);

            // Cache trạng thái TX trong Redis (dùng redisService trực tiếp)
            await this.redis.set(
                `tx:${txId}:status`,
                {
                    reservationID,
                    providerOriginal,
                    providerUsed: provider,
                    isMock: /mock/i.test(provider),
                    status: "PENDING",
                    intentId,
                    expiresAt,
                    buyer: {
                        email: buyerClaim?.email || null,
                        phone: buyerClaim?.phone || null,
                        name: buyerClaim?.name ?? buyerClaim?.fullName ?? null,
                    },
                    createdAt: Date.now(),
                },
                { ttl: this.statusTtlSec },
            );

            await this.paymentService.createIntentDoc({
                intentId,
                reservationID,
                providerOriginal,
                providerUsed: provider,
                transactionId: txId,
                buyer: buyerClaim || null,
                expiresAt,
                amount: null,
                currency: "VND",
            });

            const token = this._sign({ tx: txId, exp: expiresAt });
            const qrUrl = `${this.publicBaseUrl}/mockpay/auto?token=${encodeURIComponent(token)}`;

            const body = {
                success: true,
                data: {
                    paymentIntentID: intentId,
                    transactionId: txId,
                    status: "PENDING",
                    expiresAt,
                    ui: { kind: "qr", url: qrUrl },
                },
            };

            if (idemKey) {
                const ttlBaseSec = Math.ceil(
                    (Number(ttlMs) || this.intentTtlMs) / 1000,
                );
                await setIntentIdemFinal(this.redis, idemKey, 200, body, {
                    ttlBaseSec,
                    ttlPadSec: this.idemPadSec,
                });
            }

            res.setHeader("X-Provider-Original", providerOriginal);
            res.setHeader("X-Provider-Used", provider);
            return res.status(200).json(body);
        } catch (err) {
            if (idemKey) {
                const ttlBaseSec = Math.ceil(this.intentTtlMs / 1000);
                await setIntentIdemFinal(
                    this.redis,
                    idemKey,
                    500,
                    { success: false, error: "INTERNAL_ERROR" },
                    { ttlBaseSec, ttlPadSec: this.idemPadSec },
                ).catch(() => {});
            }
            this.logger.error?.("[POST /payments/intents] error", err);
            return res
                .status(500)
                .json({ success: false, error: "INTERNAL_ERROR" });
        }
    };

    // GET /payments/:tx/status
    _getTxStatus = async (req, res) => {
        const cur = await this._get(`tx:${req.params.tx}:status`);

        if (!cur)
            return res.status(404).json({ success: false, error: "NOT_FOUND" });
        const token = this._sign({ tx: req.params.tx, exp: cur.expiresAt });

        return res.json({
            success: true,
            data: {
                status: cur.status,
                expiresAt: cur.expiresAt || null,
                ui: cur.isMock
                    ? {
                          kind: "qr",
                          url: `${this.publicBaseUrl}/mockpay/auto?token=${encodeURIComponent(token)}`,
                      }
                    : undefined,
                orderId: cur.orderId || undefined,
                claim: cur.claim || undefined,
            },
        });
    };

    // GET /mockpay/auto?token=...  (JSON-only, không HTML)
    _mockpayAuto = async (req, res) => {
        try {
            const { token } = req.query;
            const { tx, exp } = this._verify(token);
            const key = `tx:${tx}:status`;

            if (Date.now() > Number(exp)) {
                const cur = await this._get(key);
                if (cur && cur.status !== "EXPIRED") {
                    const updated = {
                        ...cur,
                        status: "EXPIRED",
                        updatedAt: Date.now(),
                    };
                    await this._set(key, updated);
                    if (cur.intentId) {
                        await this.paymentService.updateIntentStatus({
                            intentId: cur.intentId,
                            newStatus: "EXPIRED",
                            providerResp: {
                                status: "EXPIRED",
                                transactionId: tx,
                            },
                        });
                    }
                }
                return res.status(410).json({
                    success: false,
                    message: "QR expired",
                    data: { transactionId: tx, status: "EXPIRED" },
                });
            }

            const cur = await this._get(key);
            if (!cur)
                return res
                    .status(404)
                    .json({ success: false, message: "TX not found" });

            if (["SUCCEEDED", "FAILED", "EXPIRED"].includes(cur.status)) {
                return res.json({
                    success: true,
                    data: { transactionId: tx, status: cur.status },
                });
            }

            const roll = Math.random();
            const next =
                roll < this.mockSuccessRate
                    ? "SUCCEEDED"
                    : roll < this.mockSuccessRate + 0.18
                      ? "FAILED"
                      : "PENDING";

            const updated = { ...cur, status: next, updatedAt: Date.now() };
            await this._set(key, updated);

            if (cur.intentId) {
                await this.paymentService.updateIntentStatus({
                    intentId: cur.intentId,
                    newStatus: next,
                    providerResp: {
                        status: next,
                        transactionId: tx,
                        raw: updated,
                    },
                });
            }

            return res.json({
                success: true,
                data: { transactionId: tx, status: next },
            });
        } catch {
            return res
                .status(400)
                .json({ success: false, message: "Invalid token" });
        }
    };

    initRoutes() {
        this.router.post("/payment/intents", this._postCreateIntent);
        this.router.get("/payment/:tx/status", this._getTxStatus);
        this.router.get("/mockpay/auto", this._mockpayAuto);
    }
}
