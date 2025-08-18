// services/payment.service.js
import {
    AppError,
    ERROR_CODE,
    PROVIDER_TYPE_MAP,
} from "@event_ticket_booking_system/shared";

import {
    PAYMENT_STATUS,
    REFUND_STATUS,
    TERMINAL,
    normalizeStatus,
} from "../enums/payment-status.js";
import { MOMO_MODES } from "../enums/payment-provider.js";
import { genMockMomoKeys } from "../utils/payment.utils.js";

const PAYMENT_COLLECTION = "paymentMethods";
const PAYMENT_INTENTS = "paymentIntents";
const PAYMENT_REFUNDS = "paymentRefunds";
const REFRESH_TTL_MS_DEFAULT = 10_000;

export class PaymentService {
    constructor({ db, redisService, paymentProducer, logger = console }) {
        this.db = db;
        this.redisService = redisService;
        this.logger = logger;

        this.paymentCollection = this.db.collection(PAYMENT_COLLECTION);

        // INTENTS
        this.paymentIntentCollection = this.db.collection(PAYMENT_INTENTS);
        this.paymentRefundCollection = this.db.collection(PAYMENT_REFUNDS);
        this.paymentProducer = paymentProducer;
        this.refreshTtlMs = REFRESH_TTL_MS_DEFAULT;

        this.CACHE_KEYS = {
            PAYMENT_METHODS_BY_USER_ID: (userID) => `payment:methods:${userID}`,
        };
    }

    // ---------- Utility ----------
    async invalidateCache(userID) {
        await this.redisService.del(
            this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID),
        );
    }

    // ---------- Get methods ----------
    async getPaymentMethodsByUserID(userID) {
        const cacheKey = this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID);

        return this.redisService.getOrSet(cacheKey, async () => {
            const querySnapshot = await this.paymentCollection
                .where("userID", "==", userID)
                .orderBy("isDefault", "desc")
                .orderBy("createdAt", "asc")
                .get();

            if (querySnapshot.empty) return [];
            return querySnapshot.docs.map((doc) => ({
                paymentMethodID: doc.id,
                ...doc.data(),
            }));
        });
    }

    // ---------- Find or create ----------
    async findOrCreatePaymentMethod(userID, paymentData) {
        const type = PROVIDER_TYPE_MAP[paymentData.provider];
        if (!type) {
            throw new AppError({
                message: `Unsupported provider: ${paymentData.provider}`,
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        if (paymentData.provider === "momo") {
            const mode =
                paymentData.mode && MOMO_MODES.has(paymentData.mode)
                    ? paymentData.mode
                    : "mock";
            paymentData.mode = mode;

            if (mode === "mock") {
                if (!paymentData.mock) paymentData.mock = {};
                if (
                    !paymentData.mock.partnerCode ||
                    !paymentData.mock.accessKey ||
                    !paymentData.mock.secretKey
                ) {
                    paymentData.mock = {
                        ...genMockMomoKeys(userID),
                        ...paymentData.mock,
                    };
                }
            } else if (mode === "merchant") {
                const ok =
                    paymentData.merchant?.partnerCode &&
                    paymentData.merchant?.accessKey &&
                    paymentData.merchant?.secretKey &&
                    paymentData.merchant?.returnUrl &&
                    paymentData.merchant?.ipnUrl;
                if (!ok) {
                    throw new AppError({
                        message:
                            "Missing MoMo merchant credentials (partnerCode/accessKey/secretKey/returnUrl/ipnUrl).",
                        errorCode: ERROR_CODE.INVALID_DATA,
                        statusCode: 400,
                    });
                }
            } else if (mode === "manual") {
                const ok =
                    paymentData.account ||
                    paymentData.manual?.momoNumber ||
                    paymentData.manual?.qrImageUrl;
                if (!ok) {
                    throw new AppError({
                        message:
                            "Manual MoMo requires account or manual.momoNumber/qrImageUrl.",
                        errorCode: ERROR_CODE.INVALID_DATA,
                        statusCode: 400,
                    });
                }
            }
        }

        // Build unique query
        let findQuery = this.paymentCollection.where("userID", "==", userID);
        let hasUniqueCriteria = false;

        switch (paymentData.provider) {
            case "momo": {
                findQuery = findQuery
                    .where("provider", "==", "momo")
                    .where("mode", "==", paymentData.mode || "mock");

                if (paymentData.mode === "mock") {
                    const partnerCode = paymentData.mock?.partnerCode;
                    if (partnerCode) {
                        findQuery = findQuery.where(
                            "mock.partnerCode",
                            "==",
                            partnerCode,
                        );
                        hasUniqueCriteria = true;
                    }
                } else if (paymentData.mode === "merchant") {
                    const partnerCode = paymentData.merchant?.partnerCode;
                    if (partnerCode) {
                        findQuery = findQuery.where(
                            "merchant.partnerCode",
                            "==",
                            partnerCode,
                        );
                        hasUniqueCriteria = true;
                    }
                } else {
                    const acc =
                        paymentData.account || paymentData.manual?.momoNumber;
                    if (!acc) {
                        throw new AppError({
                            message:
                                "Manual MoMo requires account or manual.momoNumber.",
                            errorCode: ERROR_CODE.INVALID_DATA,
                            statusCode: 400,
                        });
                    }
                    findQuery = findQuery.where("account", "==", acc);
                    hasUniqueCriteria = true;
                }
                break;
            }
            case "zalopay": {
                if (!paymentData.account) {
                    throw new AppError({
                        message: "Account identifier is required for zalopay.",
                        errorCode: ERROR_CODE.INVALID_DATA,
                        statusCode: 400,
                    });
                }
                findQuery = findQuery
                    .where("provider", "==", "zalopay")
                    .where("account", "==", paymentData.account);
                hasUniqueCriteria = true;
                break;
            }
            case "stripe":
            default:
                hasUniqueCriteria = false;
                break;
        }

        // Deduplicate by unique criteria
        if (hasUniqueCriteria) {
            const snap = await findQuery.limit(1).get();
            const doc = snap.docs[0];
            if (doc) {
                const existing = { paymentMethodID: doc.id, ...doc.data() };
                if (paymentData.isDefault && !existing.isDefault) {
                    await this.setDefaultPaymentMethod(
                        userID,
                        existing.paymentMethodID,
                    );
                    return { ...existing, isDefault: true };
                }
                return existing;
            }
        }

        const countSnap = await this.paymentCollection
            .where("userID", "==", userID)
            .limit(1)
            .get();
        const isFirst = countSnap.empty;

        const now = new Date().toISOString();
        const newPaymentMethodData = {
            ...paymentData,
            userID,
            type,
            isDefault: paymentData.isDefault || isFirst || false,
            createdAt: now,
            updatedAt: now,
        };

        if (newPaymentMethodData.isDefault) {
            await this.unsetDefaultAll(userID);
        }

        const docRef = await this.paymentCollection.add(newPaymentMethodData);
        await this.invalidateCache(userID);
        return { paymentMethodID: docRef.id, ...newPaymentMethodData };
    }

    // ---------- Unset all defaults ----------
    async unsetDefaultAll(userID) {
        const methodsSnapshot = await this.paymentCollection
            .where("userID", "==", userID)
            .where("isDefault", "==", true)
            .get();

        if (methodsSnapshot.empty) return;

        const batch = this.db.batch();
        const now = new Date().toISOString();
        methodsSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                isDefault: false,
                updatedAt: now,
            });
        });
        await batch.commit();
    }

    // ---------- Set default ----------
    async setDefaultPaymentMethod(userID, paymentMethodID) {
        await this.db.runTransaction(async (transaction) => {
            const methodToSetRef = this.paymentCollection.doc(paymentMethodID);

            const currentDefaultsQuery = this.paymentCollection
                .where("userID", "==", userID)
                .where("isDefault", "==", true);

            const currentDefaultsSnapshot =
                await transaction.get(currentDefaultsQuery);

            const now = new Date().toISOString();

            currentDefaultsSnapshot.forEach((doc) => {
                transaction.update(doc.ref, {
                    isDefault: false,
                    updatedAt: now,
                });
            });

            transaction.update(methodToSetRef, {
                isDefault: true,
                updatedAt: now,
            });
        });

        await this.invalidateCache(userID);
    }

    // ---------- Update ----------
    async updatePaymentMethod(userID, paymentMethodID, updates) {
        const docRef = this.paymentCollection.doc(paymentMethodID);

        if (updates.isDefault === true) {
            await this.setDefaultPaymentMethod(userID, paymentMethodID);
        }

        const now = new Date().toISOString();
        await docRef.update({ ...updates, updatedAt: now });

        await this.invalidateCache(userID);

        const updatedDoc = await docRef.get();
        return {
            paymentMethodID: updatedDoc.id,
            ...updatedDoc.data(),
        };
    }

    // ---------- Delete ----------
    async deletePaymentMethod(userID, paymentMethodID) {
        const doc = await this.paymentCollection.doc(paymentMethodID).get();
        if (!doc.exists || doc.data().userID !== userID) {
            throw new AppError({
                message: "Payment method not found or permission denied.",
                errorCode: ERROR_CODE.NOT_FOUND,
                statusCode: 404,
            });
        }

        if (doc.data().isDefault) {
            const methods = await this.getPaymentMethodsByUserID(userID);
            if (methods.length <= 1) {
                throw new AppError({
                    message: "Cannot delete the only default payment method.",
                    statusCode: 409,
                    errorCode: ERROR_CODE.INVALID_DATA,
                });
            }
            const newDefault = methods.find(
                (m) => m.paymentMethodID !== paymentMethodID,
            );
            if (newDefault) {
                await this.setDefaultPaymentMethod(
                    userID,
                    newDefault.paymentMethodID,
                );
            }
        }

        await this.paymentCollection.doc(paymentMethodID).delete();
        await this.invalidateCache(userID);

        return { success: true };
    }

    // ===================== Payment Intents (DB-first Confirm) =====================

    async _getByPaymentIntentID(paymentIntentID) {
        const snap = await this.paymentIntentCollection
            .doc(paymentIntentID)
            .get();
        if (!snap.exists) return null;
        return { paymentIntentID: snap.id, ...snap.data() };
    }

    async _getByReservationID(reservationID) {
        const qs = await this.paymentIntentCollection
            .where("reservationID", "==", reservationID)
            .limit(1)
            .get();
        const doc = qs.docs[0];
        if (!doc) return null;
        return { paymentIntentID: doc.id, ...doc.data() };
    }

    async _maybePublishStatusChange(oldStatus, newStatus, intent) {
        if (oldStatus === newStatus) return;

        const payload = {
            paymentIntentID: intent.paymentIntentID,
            reservationID: intent.reservationID,
            provider: intent.provider,
            amount: intent.amount,
            currency: intent.currency,
            transactionId: intent.transactionId,
            oldStatus,
            newStatus,
        };
        const meta = {
            idempotencyKey: `${intent.paymentIntentID}:${newStatus}`,
        };

        try {
            if (newStatus === PAYMENT_STATUS.SUCCEEDED) {
                await this.paymentProducer.succeeded(payload, meta);
            } else if (newStatus === PAYMENT_STATUS.FAILED) {
                await this.paymentProducer.failed(payload, meta);
            } else if (newStatus === PAYMENT_STATUS.CANCELED) {
                await this.paymentProducer.canceled(payload, meta);
            } else if (newStatus === PAYMENT_STATUS.EXPIRED) {
                await this.paymentProducer.expired(payload, meta);
            } else {
                await this.paymentProducer.statusUpdated(payload, meta);
            }
        } catch (e) {
            this.logger.error(
                "[PaymentService] publish failed:",
                e?.message || e,
            );
        }
    }

    /**
     * Tạo document intent chuẩn trong Firestore (docId = intentId).
     */
    async createIntentDoc({
        intentId,
        reservationID,
        providerOriginal,
        providerUsed,
        transactionId,
        buyer,
        expiresAt,
        amount = null,
        currency = "VND",
    }) {
        if (!intentId || !reservationID) {
            throw new AppError({
                message: "intentId & reservationID are required.",
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        const nowIso = new Date().toISOString();
        const doc = {
            reservationID,
            provider: providerUsed,
            providerOriginal: providerOriginal || providerUsed,
            status: PAYMENT_STATUS.PENDING,
            orderId: `ORD_${intentId}`,
            transactionId: transactionId || null,
            amount,
            currency,
            buyer: buyer || null,
            metadata: { isMock: /mock/i.test(providerUsed) },
            statusHistory: [],
            lastProviderCheckAt: null,
            statusUpdatedAt: nowIso,
            expiresAt,
            createdAt: nowIso,
            updatedAt: nowIso,
        };

        await this.paymentIntentCollection.doc(intentId).set(doc);
        return { paymentIntentID: intentId, ...doc };
    }

    /**
     * Update intent status (từ mockpay/auto hoặc provider IPN/verify).
     */
    async updateIntentStatus({ intentId, newStatus, providerResp }) {
        const docRef = this.paymentIntentCollection.doc(intentId);
        let before = null;
        let after = null;

        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) {
                throw new AppError({
                    message: "Payment intent not found.",
                    errorCode: ERROR_CODE.NOT_FOUND,
                    statusCode: 404,
                });
            }

            const cur = snap.data();
            before = { paymentIntentID: intentId, ...cur };
            const curStatus = cur.status || PAYMENT_STATUS.PENDING;

            if (TERMINAL.has(curStatus)) {
                after = before;
                return;
            }

            const normalized = normalizeStatus(
                newStatus || PAYMENT_STATUS.PENDING,
            );
            const nowIso = new Date().toISOString();
            const upd = {
                updatedAt: nowIso,
                lastProviderCheckAt: nowIso,
                providerLastRaw: providerResp || null,
            };

            if (normalized !== curStatus) {
                upd.status = normalized;
                upd.statusUpdatedAt = nowIso;
                upd.statusHistory = [
                    ...(cur.statusHistory || []),
                    {
                        from: curStatus,
                        to: normalized,
                        at: nowIso,
                        reason: "updateIntentStatus",
                    },
                ];
            }

            if (
                providerResp?.transactionId &&
                providerResp.transactionId !== cur.transactionId
            ) {
                upd.transactionId = providerResp.transactionId;
            }

            tx.update(docRef, upd);
            after = { ...before, ...upd };
        });

        const oldStatus = before.status || PAYMENT_STATUS.PENDING;
        const effStatus = after.status || oldStatus;
        if (effStatus !== oldStatus) {
            await this._maybePublishStatusChange(oldStatus, effStatus, after);
        }

        return { ...after, status: effStatus };
    }

    /**
     * Confirm/check trạng thái payment theo paymentIntentID hoặc reservationID.
     */
    async confirmByIntent({ paymentIntentID, reservationID, refresh = false }) {
        if (!paymentIntentID && !reservationID) {
            throw new AppError({
                message: "paymentIntentID or reservationID is required.",
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        const intent =
            (paymentIntentID &&
                (await this._getByPaymentIntentID(paymentIntentID))) ||
            (reservationID && (await this._getByReservationID(reservationID)));

        if (!intent) {
            throw new AppError({
                message: "Payment intent not found.",
                errorCode: ERROR_CODE.NOT_FOUND,
                statusCode: 404,
            });
        }

        const {
            paymentIntentID: pid,
            reservationID: rid,
            provider,
            status: currentStatus = PAYMENT_STATUS.PENDING,
            orderId,
            transactionId,
            amount,
            currency = "VND",
            lastProviderCheckAt,
        } = intent;

        if (TERMINAL.has(currentStatus)) {
            return {
                ...intent,
                status: currentStatus,
                confirmed: currentStatus === PAYMENT_STATUS.SUCCEEDED,
                refreshed: false,
                source: "cache",
            };
        }

        const now = Date.now();
        const lastCheckMs = lastProviderCheckAt
            ? new Date(lastProviderCheckAt).getTime()
            : 0;
        const shouldRefresh = refresh || now - lastCheckMs > this.refreshTtlMs;

        if (!shouldRefresh) {
            return {
                ...intent,
                status: currentStatus,
                confirmed: false,
                refreshed: false,
                source: "cache",
            };
        }

        const client = this.providers?.[provider];
        if (!client || typeof client.verify !== "function") {
            throw new AppError({
                message: `Unsupported or missing provider client: ${provider}`,
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        const providerResp = await client.verify({
            orderId,
            transactionId,
            amount,
            currency,
            metadata: intent.metadata || {},
        });

        const newStatus = normalizeStatus(providerResp?.status);

        const docRef = this.paymentIntentCollection.doc(pid);
        let updated = null;

        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) {
                throw new AppError({
                    message: "Payment intent not found.",
                    errorCode: ERROR_CODE.NOT_FOUND,
                    statusCode: 404,
                });
            }

            const cur = snap.data();
            const curStatus = cur.status || PAYMENT_STATUS.PENDING;

            if (TERMINAL.has(curStatus)) {
                updated = { paymentIntentID: pid, ...cur, status: curStatus };
                return;
            }

            const nowIso = new Date().toISOString();
            const fieldsToUpdate = {
                lastProviderCheckAt: nowIso,
                providerLastRaw: providerResp || null,
            };

            if (newStatus !== curStatus) {
                fieldsToUpdate.status = newStatus;
                fieldsToUpdate.statusUpdatedAt = nowIso;
                fieldsToUpdate.statusHistory = [
                    ...(cur.statusHistory || []),
                    {
                        from: curStatus,
                        to: newStatus,
                        at: nowIso,
                        reason: "provider.verify",
                    },
                ];

                if (
                    providerResp?.transactionId &&
                    providerResp.transactionId !== cur.transactionId
                ) {
                    fieldsToUpdate.transactionId = providerResp.transactionId;
                }
                if (
                    providerResp?.amount &&
                    providerResp.amount !== cur.amount
                ) {
                    fieldsToUpdate.amount = providerResp.amount;
                }
                if (
                    providerResp?.currency &&
                    providerResp.currency !== cur.currency
                ) {
                    fieldsToUpdate.currency = providerResp.currency;
                }
            }

            tx.update(docRef, fieldsToUpdate);
            updated = { paymentIntentID: pid, ...cur, ...fieldsToUpdate };
        });

        const oldStatus = intent.status || PAYMENT_STATUS.PENDING;
        const effectiveStatus = updated.status || oldStatus;
        if (effectiveStatus !== oldStatus) {
            await this._maybePublishStatusChange(oldStatus, effectiveStatus, {
                ...intent,
                ...updated,
                paymentIntentID: pid,
                reservationID: rid,
                provider,
            });
        }

        return {
            ...intent,
            ...updated,
            status: effectiveStatus,
            confirmed: effectiveStatus === PAYMENT_STATUS.SUCCEEDED,
            refreshed: true,
            source: "provider",
        };
    }

    async createOrGetRefund({ reservationID, reason, metadata, idemKey }) {
        if (!reservationID) {
            return {
                statusCode: 400,
                envelope: {
                    success: false,
                    message: "reservationID is required.",
                    errorCode: ERROR_CODE.INVALID_DATA,
                    statusCode: 400,
                    data: null,
                },
            };
        }
        const effectiveIdemKey = idemKey || `${reservationID}:refund`;

        const intentDoc = await this._getByReservationID(reservationID);
        if (!intentDoc) {
            return {
                statusCode: 404,
                envelope: {
                    success: false,
                    message: "Payment intent not found for reservation.",
                    errorCode: ERROR_CODE.NOT_FOUND,
                    statusCode: 404,
                    data: null,
                },
            };
        }
        if (intentDoc.status !== PAYMENT_STATUS.SUCCEEDED) {
            return {
                statusCode: 409,
                envelope: {
                    success: false,
                    message: "NOT_REFUNDABLE",
                    errorCode: ERROR_CODE.INVALID_DATA,
                    statusCode: 409,
                    data: null,
                },
            };
        }

        const {
            paymentIntentID,
            provider,
            amount,
            currency = "VND",
            transactionId,
            orderId,
        } = intentDoc;

        const existingByIdem = await this._findRefundByReservationAndIdemKey(
            reservationID,
            effectiveIdemKey,
        );
        if (existingByIdem) {
            return {
                statusCode: 200,
                envelope: {
                    success: true,
                    message: "Refund processed",
                    data: this._refundView(existingByIdem, {
                        idempotent: true,
                    }),
                },
            };
        }

        const existingSucceeded =
            await this._findRefundSucceededByPaymentIntent(paymentIntentID);
        if (existingSucceeded) {
            return {
                statusCode: 200,
                envelope: {
                    success: true,
                    message: "Refund processed",
                    data: this._refundView(existingSucceeded, {
                        idempotent: true,
                    }),
                },
            };
        }

        const nowIso = new Date().toISOString();
        const newRefund = {
            reservationID,
            paymentIntentID,
            provider,
            amount,
            currency,
            status: REFUND_STATUS.PENDING,
            reason: reason || null,
            metadata: metadata || null,
            idemKey: effectiveIdemKey,
            providerRefundId: null,
            lastProviderCheckAt: null,
            refundedAt: null,
            errorCode: null,
            errorMessage: null,
            createdAt: nowIso,
            updatedAt: nowIso,
        };

        const refundRef = await this.paymentRefundCollection.add(newRefund);
        const refundId = refundRef.id;

        try {
            const client = this.providers?.[provider];
            if (!client || typeof client.refund !== "function") {
                throw new Error(
                    `Unsupported or missing provider client for refund: ${provider}`,
                );
            }

            const providerResp = await client.refund({
                paymentIntentId: paymentIntentID,
                transactionId,
                orderId,
                amount,
                currency,
                reason,
                metadata,
            });

            const s = (providerResp?.status || "").toUpperCase();
            const isSucceeded = s === REFUND_STATUS.SUCCEEDED;
            const isFailed = s === REFUND_STATUS.FAILED;

            const upd = {
                status: isSucceeded
                    ? REFUND_STATUS.SUCCEEDED
                    : isFailed
                      ? REFUND_STATUS.FAILED
                      : REFUND_STATUS.PENDING,
                providerRefundId: providerResp?.providerRefundId || null,
                lastProviderCheckAt: new Date().toISOString(),
                refundedAt: isSucceeded ? new Date().toISOString() : null,
                errorCode: providerResp?.errorCode || null,
                errorMessage: providerResp?.errorMessage || null,
                updatedAt: new Date().toISOString(),
                providerLastRaw: providerResp?.raw || providerResp || null,
            };

            await refundRef.update(upd);

            if (
                upd.status === REFUND_STATUS.SUCCEEDED ||
                upd.status === REFUND_STATUS.FAILED
            ) {
                const payload = {
                    reservationID,
                    paymentIntentID,
                    update: {
                        refund: {
                            status: upd.status,
                            amount,
                            currency,
                            refundId,
                            providerRefundId: upd.providerRefundId,
                        },
                    },
                    ts: new Date().toISOString(),
                };
                const meta = { idempotencyKey: `${refundId}:${upd.status}` };
                try {
                    await this.paymentProducer.statusUpdated(payload, meta);
                } catch (e) {
                    this.logger.error(
                        "[PaymentService] publish refund status failed:",
                        e?.message || e,
                    );
                }
            }
        } catch (err) {
            const upd = {
                status: REFUND_STATUS.PENDING,
                lastProviderCheckAt: new Date().toISOString(),
                errorCode: "PROVIDER_ERROR",
                errorMessage: err?.message || String(err),
                updatedAt: new Date().toISOString(),
            };
            await refundRef.update(upd);
        }

        // ---- RETURN (fix bug snapData) ----
        const snap = await refundRef.get();
        const saved = { refundId, ...(snap.data?.() || snap.data || {}) };
        return {
            statusCode: 200,
            envelope: {
                success: true,
                message: "Refund processed",
                data: this._refundView(saved, { idempotent: false }),
            },
        };
    }

    _refundView(r, { idempotent }) {
        return {
            reservationID: r.reservationID,
            paymentIntentID: r.paymentIntentID,
            refundId: r.refundId || r.id,
            provider: r.provider,
            refundStatus: r.status,
            amount: r.amount,
            currency: r.currency,
            providerRefundId: r.providerRefundId || null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            idempotent,
        };
    }

    async _findRefundByReservationAndIdemKey(reservationID, idemKey) {
        const q = await this.paymentRefundCollection
            .where("reservationID", "==", reservationID)
            .limit(50)
            .get();

        const doc = (q.docs || [])
            .map((d) => ({ id: d.id, ...d.data() }))
            .find((x) => x.idemKey === idemKey);

        return doc ? { refundId: doc.id, ...doc } : null;
    }

    async _findRefundSucceededByPaymentIntent(paymentIntentID) {
        const q = await this.paymentRefundCollection
            .where("paymentIntentID", "==", paymentIntentID)
            .limit(50)
            .get();

        const doc = (q.docs || [])
            .map((d) => ({ id: d.id, ...d.data() }))
            .find((x) => x.status === REFUND_STATUS.SUCCEEDED);

        return doc ? { refundId: doc.id, ...doc } : null;
    }
}
