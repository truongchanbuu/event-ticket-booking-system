import { AppError, ERROR_CODE } from '@event_ticket_booking_system/shared';

const PAYMENT_COLLECTION = 'paymentMethods';

export class PaymentService {
    constructor({ db, redisService }) {
        this.db = db;
        this.redisService = redisService;
        this.paymentCollection = this.db.collection(PAYMENT_COLLECTION);

        this.CACHE_KEYS = {
            PAYMENT_METHODS_BY_USER_ID: (userID) => `payment:methods:${userID}`,
        };
    }

    async getPaymentMethodsByUserID(userID) {
        const cacheKey = this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID);

        return this.redisService.getOrSet(cacheKey, async () => {
            console.log(`Cache MISS for user ${userID}. Fetching from DB.`);

            const querySnapshot = await this.paymentCollection
                .where('userID', '==', userID)
                .orderBy('isDefault', 'desc')
                .orderBy('createdAt', 'asc')
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

    async createPaymentMethod(userID, paymentData) {
        const now = new Date().toISOString();

        const newPaymentMethod = {
            ...paymentData,
            userID,
            isDefault: paymentData.isDefault || false,
            createdAt: now,
        };

        if (newPaymentMethod.isDefault) {
            const methods = await this.getPaymentMethodsByUserID(userID);
            for (const method of methods) {
                if (method.isDefault) {
                    await this.paymentCollection
                        .doc(method.id)
                        .update({ isDefault: false, updatedAt: now });
                }
            }
        }

        const docRef = await this.paymentCollection.add(newPaymentMethod);

        await this.redisService.del(
            this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID),
        );
        console.log(`Invalidated cache for user ${userID}`);

        return { paymentMethodID: docRef.id, ...newPaymentMethod };
    }

    async updatePaymentMethod(userID, paymentMethodID, updates) {
        const now = new Date().toISOString();
        const updateData = {
            ...updates,
            updatedAt: now,
        };

        const docRef = this.paymentCollection.doc(paymentMethodID);

        // Nếu đang cập nhật thành mặc định
        if (updates.isDefault === true) {
            const methods = await this.getPaymentMethodsByUserID(userID);
            for (const method of methods) {
                // Bỏ mặc định của các phương thức khác
                if (method.isDefault && method.id !== paymentMethodID) {
                    await this.paymentCollection
                        .doc(method.id)
                        .update({ isDefault: false, updatedAt: now });
                }
            }
        }

        await docRef.update(updateData);

        await this.redisService.del(
            this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID),
        );
        console.log(`Invalidated cache for user ${userID}`);

        const updatedDoc = await docRef.get();
        return { paymentMethodID: updatedDoc.id, ...updatedDoc.data() };
    }

    async deletePaymentMethod(userID, paymentMethodID) {
        const doc = await this.paymentCollection.doc(paymentMethodID).get();
        if (!doc.exists || doc.data().userID !== userID) {
            throw new AppError({
                message: 'Payment method not found or permission denied.',
                errorCode: ERROR_CODE.NOT_FOUND,
                statusCode: 404,
            });
        }

        if (doc.data().isDefault) {
            const methods = await this.getPaymentMethodsByUserID(userID);
            if (methods.length <= 1) {
                throw new AppError({
                    message: 'Cannot delete the only default payment method.',
                    statusCode: 409,
                    errorCode: ERROR_CODE.INVALID_DATA,
                });
            }
        }

        await this.paymentCollection.doc(paymentMethodID).delete();

        await this.redisService.del(
            this.CACHE_KEYS.PAYMENT_METHODS_BY_USER_ID(userID),
        );
        console.log(`Invalidated cache for user ${userID}`);

        return { success: true };
    }
}
