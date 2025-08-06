import { AppError, ERROR_CODE } from "@event_ticket_booking_system/shared";

const TICKET_TYPE_COLLECTION = "ticketTypes";
const BOOKING_COLLECTION = "bookings";

export class TicketService {
    constructor({ db, redisService, redisLockService }) {
        this.db = db;
        this.ticketTypeCollection = this.db.collection(TICKET_TYPE_COLLECTION);
        this.bookingCollection = this.db.collection(BOOKING_COLLECTION);
        this.redisService = redisService;
        this.redisLockService = redisLockService;

        this.CACHE_KEYS = {
            TICKET_TYPES_BY_EVENTID: (eventID) =>
                `event:${eventID}:ticketTypes`,
        };
    }

    /**
     * Create a new ticket type for an event.
     * @param {Ticket Type Data} ticketData
     * @returns Ticket Type ID
     */
    async findOrCreateTicketType(ticketData) {
        const { eventID, name, price, totalQuantity } = ticketData;
        const query = this.ticketTypeCollection
            .where("eventID", "==", eventID)
            .where("name", "==", name)
            .where("price", "==", price);

        const snapshot = await query.get();

        if (!snapshot.empty) {
            const existingTicketTypeId = snapshot.docs[0].id;
            console.log(
                `Found existing ticket type ${existingTicketTypeId} for event ${eventID}.`,
            );
            return existingTicketTypeId;
        }

        const newTicketTypeData = {
            ...ticketData,
            remainingQuantity: totalQuantity,
            checkInQuantity: 0,
            createdAt: new Date().toISOString(),
        };

        const docRef = await this.ticketTypeCollection.add(newTicketTypeData);

        // 4. Xóa cache Redis
        const cacheKey = this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
        await this.redisService.del(cacheKey);

        console.log(
            `Created new ticket type ${docRef.id} for event ${eventID}. Cache invalidated.`,
        );

        return docRef.id;
    }

    /**
     * Lấy tất cả các loại vé cho một sự kiện.
     * @param {string} eventID ID của sự kiện
     * @returns {Promise<object[]>} Danh sách các loại vé
     */
    async getTicketTypesByEvent(eventID) {
        const cacheKey = this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
        const fiveMinutesInSeconds = 300;

        return this.redisService.getOrSet(
            cacheKey,
            async () => {
                console.log(
                    `Cache miss for ${cacheKey}. Fetching from Firestore.`,
                );
                const snapshot = await this.ticketTypeCollection
                    .where("eventID", "==", eventID)
                    .get();

                if (snapshot.empty) {
                    return [];
                }

                return snapshot.docs.map((doc) => ({
                    ticketTypeID: doc.id,
                    ...doc.data(),
                }));
            },
            fiveMinutesInSeconds,
        );
    }

    /**
     * Cập nhật thông tin của một loại vé.
     * Hàm này được thiết kế để an toàn khi chạy đồng thời với các hoạt động đặt vé.
     * @param {string} ticketTypeID ID của loại vé cần cập nhật.
     * @param {object} updateData Đối tượng chứa các trường cần cập nhật (ví dụ: { price: 550000, name: "Vé VIP Mới" }).
     * @returns {Promise<{success: boolean, id: string}>}
     */
    async updateTicketType(ticketTypeID, updateData) {
        const allowedUpdates = ["name", "price", "totalQuantity"];
        const validUpdateData = {};
        for (const key of allowedUpdates) {
            if (updateData[key] !== undefined) {
                validUpdateData[key] = updateData[key];
            }
        }

        if (Object.keys(validUpdateData).length === 0) {
            throw new AppError({
                message: "No valid fields to update.",
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
            });
        }

        const resourceKey = `ticket_type:${ticketTypeID}`;
        return this.redisLockService.executeWithLock(resourceKey, async () => {
            console.log(
                `Lock acquired for resource: ${resourceKey}. Starting update transaction.`,
            );

            let eventID; // Biến để lưu eventID cho việc xóa cache sau này

            // 2. Chạy logic cập nhật bên trong một Firestore Transaction để đảm bảo tính nguyên tử.
            await this.db.runTransaction(async (transaction) => {
                const ticketRef = this.ticketTypeCollection.doc(ticketTypeID);
                const ticketDoc = await transaction.get(ticketRef);

                if (!ticketDoc.exists) {
                    const err = new Error(
                        `Cannot update: Ticket type with ID ${ticketTypeID} not found.`,
                    );
                    err.code = "TICKET_NOT_FOUND";
                    throw err;
                }

                const currentData = ticketDoc.data();
                eventID = currentData.eventID;
                const payloadToUpdate = { ...validUpdateData };

                if (payloadToUpdate.totalQuantity !== undefined) {
                    const soldQuantity =
                        currentData.totalQuantity -
                        currentData.remainingQuantity;

                    if (payloadToUpdate.totalQuantity < soldQuantity) {
                        const err = new Error(
                            `Invalid update: New totalQuantity (${payloadToUpdate.totalQuantity}) cannot be less than the number of tickets already sold (${soldQuantity}).`,
                        );
                        err.code = "INVALID_QUANTITY_UPDATE";
                        throw err;
                    }

                    const quantityChange =
                        payloadToUpdate.totalQuantity -
                        currentData.totalQuantity;
                    payloadToUpdate.remainingQuantity =
                        currentData.remainingQuantity + quantityChange;
                }

                transaction.update(ticketRef, payloadToUpdate);
            });

            if (eventID) {
                const cacheKey =
                    this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
                await this.redisService.del(cacheKey);
                console.log(
                    `Transaction successful. Cache invalidated for event ${eventID}.`,
                );
            }

            return ticketTypeID;
        });
    }

    /**
     * Xử lý logic đặt vé cho người dùng.
     * @param {string} userID ID của người dùng đặt vé
     * @param {string} eventID ID của sự kiện
     * @param {string} ticketTypeID ID của loại vé cần đặt
     * @param {number} quantity Số lượng vé muốn đặt
     * @returns {Promise<{bookingId: string}>} Đối tượng chứa ID của đơn đặt vé thành công
     */
    async bookTicket(userID, eventID, ticketTypeID, quantity = 1) {
        if (quantity <= 0) {
            throw new Error("Quantity must be a positive number.");
        }

        const resourceKey = `ticket_type:${ticketTypeID}`;

        return this.redisLockService.executeWithLock(resourceKey, async () => {
            console.log(
                `Lock acquired for resource: ${resourceKey}. Starting transaction.`,
            );

            const bookingResult = await this.db.runTransaction(
                async (transaction) => {
                    const ticketRef =
                        this.ticketTypeCollection.doc(ticketTypeID);
                    const ticketDoc = await transaction.get(ticketRef);

                    if (!ticketDoc.exists) {
                        const err = new Error(
                            `Ticket type with ID ${ticketTypeID} not found.`,
                        );
                        err.code = "TICKET_NOT_FOUND";
                        throw err;
                    }

                    const ticketData = ticketDoc.data();
                    if (ticketData.remainingQuantity < quantity) {
                        const err = new Error(
                            `Not enough tickets available for ${ticketTypeID}. Only ${ticketData.remainingQuantity} left.`,
                        );
                        err.code = "INSUFFICIENT_TICKETS";
                        throw err;
                    }

                    const newRemainingQuantity =
                        ticketData.remainingQuantity - quantity;
                    transaction.update(ticketRef, {
                        remainingQuantity: newRemainingQuantity,
                    });

                    const bookingRef = this.bookingCollection.doc();
                    transaction.set(bookingRef, {
                        userID,
                        eventID,
                        ticketTypeID,
                        quantity,
                        status: "confirmed",
                        createdAt: new Date().toISOString(),
                    });

                    return { bookingId: bookingRef.id };
                },
            );

            const cacheKey = this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
            await this.redisService.del(cacheKey);
            console.log(
                `Transaction successful for ${resourceKey}. Cache invalidated for event ${eventID}.`,
            );

            return bookingResult;
        });
    }
}
