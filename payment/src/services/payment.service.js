import {
    AppError,
    ERROR_CODE,
    PROVIDER_TYPE_MAP,
} from "@event_ticket_booking_system/shared";

import {
    PAYMENT_STATUS,
    TERMINAL,
    normalizeStatus,
} from "../enums/payment-status.js";

const PAYMENT_COLLECTION = "paymentMethods";
const PAYMENT_INTENTS = "paymentIntents";
const REFRESH_TTL_MS_DEFAULT = 10_000;

export class PaymentService {
    constructor({
        db,
        redisService,
        providerClients = {},
        paymentProducer,
        logger = console,
    }) {
        this.db = db;
        this.redisService = redisService;
        this.logger = logger;

        this.paymentCollection = this.db.collection(PAYMENT_COLLECTION);

        // INTENTS
        this.paymentIntentCollection = this.db.collection(PAYMENT_INTENTS);
        this.providers = providerClients;
        this.paymentProducer = paymentProducer;
        this.refreshTtlMs = REFRESH_TTL_MS_DEFAULT;

        this.CACHE_KEYS = {
            PAYMENT_METHODS_BY_USER_ID: (userID) => `payment:methods:${userID}`,
        };
    }

    // ---- Utility ----
    async invalidateCache(userID) {
        await this.redisService.del(
            this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID),
        );
    }

    // ---- Get methods ----
    async getPaymentMethodsByUserID(userID) {
        const cacheKey = this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID);

        return this.redisService.getOrSet(cacheKey, async () => {
            const querySnapshot = await this.paymentCollection
                .where("userID", "==", userID)
                .orderBy("isDefault", "desc")
                .orderBy("createdAt", "asc")
                .get();

            if (querySnapshot.empty) {
                return [];
            }

            return querySnapshot.docs.map((doc) => ({
                paymentMethodID: doc.id,
                ...doc.data(),
            }));
        });
    }

    // ---- Find or create ----
    async findOrCreatePaymentMethod(userID, paymentData) {
        // Validate provider
        const type = PROVIDER_TYPE_MAP[paymentData.provider];
        if (!type) {
            throw new AppError({
                message: `Unsupported provider: ${paymentData.provider}`,
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        let findQuery = this.paymentCollection.where("userID", "==", userID);
        let hasUniqueCriteria = false;

        switch (paymentData.provider) {
            case "momo":
            case "zalopay":
                if (!paymentData.account) {
                    throw new AppError({
                        message: `Account identifier (e.g., phone, email) is required for ${paymentData.provider}.`,
                        errorCode: ERROR_CODE.INVALID_DATA,
                        statusCode: 400,
                    });
                }
                findQuery = findQuery
                    .where("provider", "==", paymentData.provider)
                    .where("account", "==", paymentData.account);
                hasUniqueCriteria = true;
                break;
            case "stripe":
            default:
                hasUniqueCriteria = false;
                break;
        }

        // If unique criteria applies, check if method exists
        if (hasUniqueCriteria) {
            const querySnapshot = await findQuery.limit(1).get();
            const existingMethodDoc = querySnapshot.docs[0];

            if (existingMethodDoc) {
                const existingMethod = {
                    paymentMethodID: existingMethodDoc.id,
                    ...existingMethodDoc.data(),
                };

                if (paymentData.isDefault && !existingMethod.isDefault) {
                    await this.setDefaultPaymentMethod(
                        userID,
                        existingMethod.paymentMethodID,
                    );
                    return { ...existingMethod, isDefault: true };
                }
                return existingMethod;
            }
        }

        // Create new method
        const now = new Date().toISOString();
        const newPaymentMethodData = {
            ...paymentData,
            userID,
            type,
            isDefault: paymentData.isDefault || false,
            createdAt: now,
            updatedAt: now,
        };

        // If setting as default, unset others first
        if (newPaymentMethodData.isDefault) {
            await this.unsetDefaultAll(userID);
        }

        const docRef = await this.paymentCollection.add(newPaymentMethodData);
        await this.invalidateCache(userID);

        return { paymentMethodID: docRef.id, ...newPaymentMethodData };
    }

    // ---- Unset all defaults ----
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

    // ---- Set default ----
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

    // ---- Update ----
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

    // ---- Delete ----
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
            // Auto-promote another method to default
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
        // cần index: paymentIntents(reservationID asc)
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
     * Confirm/check trạng thái payment theo paymentIntentID hoặc reservationID.
     * - Không tin client payload: load toàn bộ từ DB
     * - Nếu đã terminal => trả ngay
     * - Nếu PENDING: chỉ gọi provider.verify khi refresh=true hoặc quá TTL
     */
    async confirmByIntent({ paymentIntentID, reservationID, refresh = false }) {
        if (!paymentIntentID && !reservationID) {
            throw new AppError({
                message: "paymentIntentID or reservationID is required.",
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        // 1) Load intent từ DB
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

        // Force fields we rely on
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

        // 2) Nếu terminal -> trả luôn (idempotent)
        if (TERMINAL.has(currentStatus)) {
            return {
                ...intent,
                status: currentStatus,
                confirmed: currentStatus === PAYMENT_STATUS.SUCCEEDED,
                refreshed: false,
                source: "cache",
            };
        }

        // 3) PENDING: quyết định có cần refresh provider?
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

        // 4) Gọi provider.verify bằng dữ liệu từ DB
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

        // 5) Ghi nhận cập nhật trong transaction (chống race & idempotent)
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

            // Nếu đã terminal, không downgrade/regress
            if (TERMINAL.has(curStatus)) {
                updated = { paymentIntentID: pid, ...cur, status: curStatus };
                return;
            }

            const nowIso = new Date().toISOString();
            const fieldsToUpdate = {
                lastProviderCheckAt: nowIso,
                providerLastRaw: providerResp || null,
            };

            // Chỉ cập nhật khi status đổi
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

                // Cập nhật các field nếu provider trả chính xác hơn
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

        // 6) Publish event nếu status đổi (idempotent nhờ idempotencyKey)
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
}
