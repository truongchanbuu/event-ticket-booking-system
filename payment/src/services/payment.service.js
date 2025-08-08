import {
    AppError,
    ERROR_CODE,
    PROVIDER_TYPE_MAP,
} from "@event_ticket_booking_system/shared";

const PAYMENT_COLLECTION = "paymentMethods";

export class PaymentService {
    constructor({ db, redisService }) {
        this.db = db;
        this.redisService = redisService;
        this.paymentCollection = this.db.collection(PAYMENT_COLLECTION);

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

        // If updating to default, make it transactional to avoid race conditions
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
}
