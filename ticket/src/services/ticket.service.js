import { AppError, ERROR_CODE } from "@event_ticket_booking_system/shared";

const TICKET_TYPE_COLLECTION = "ticketTypes";
const BOOKING_COLLECTION = "bookings";

export class TicketService {
    constructor({
        db,
        redisService,
        redisLockService,
        ticketLifecycleEventService,
    }) {
        this.db = db;
        this.ticketTypeCollection = this.db.collection(TICKET_TYPE_COLLECTION);
        this.bookingCollection = this.db.collection(BOOKING_COLLECTION);
        this.ticketLifecycleEventService = ticketLifecycleEventService;
        this.redisService = redisService;
        this.redisLockService = redisLockService;

        this.CACHE_KEYS = {
            TICKET_TYPES_BY_EVENTID: (eventID) =>
                `event:${eventID}:ticketTypes`,
        };

        this.LOCK_KEYS = {
            EVENT_TICKETS: (eventID) => `event:${eventID}:ticketTypes`,
        };
    }

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

        const cacheKey = this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
        await this.redisService.del(cacheKey);

        console.log(
            `Created new ticket type ${docRef.id} for event ${eventID}. Cache invalidated.`,
        );

        const ticketTypeID = docRef.id;
        await this.ticketLifecycleEventService.sendTicketTypeCreated({
            ...ticketData,
            ticketTypeID,
            eventID,
        });

        return docRef.id;
    }

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

    async updateTicketType(ticketTypeID, eventID, updateData) {
        const allowedUpdates = ["name", "price", "totalQuantity", "currency"];
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

        const resourceKey = this.LOCK_KEYS.EVENT_TICKETS(eventID);
        return this.redisLockService.executeWithLock(resourceKey, async () => {
            console.log(
                `Lock acquired for resource: ${resourceKey}. Starting update transaction.`,
            );

            let eventID;

            await this.db.runTransaction(async (transaction) => {
                const ticketRef = this.ticketTypeCollection.doc(ticketTypeID);
                const ticketDoc = await transaction.get(ticketRef);

                if (!ticketDoc.exists) {
                    const err = new AppError({
                        message: `Cannot update: Ticket type with ID ${ticketTypeID} not found.`,
                        statusCode: 404,
                        errorCode: ERROR_CODE.NOT_FOUND,
                    });
                    throw err;
                }

                const currentData = ticketDoc.data();
                if (currentData.publishedAt) {
                    throw new AppError({
                        message: "You cannot update a published ticket types",
                        statusCode: 403,
                        errorCode: ERROR_CODE.FORBIDDEN,
                    });
                }

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
                await this.ticketLifecycleEventService.sendTicketTypeUpdated({
                    ticketTypeID,
                    eventID,
                    ...validUpdateData,
                });
            }

            return ticketTypeID;
        });
    }

    async publishTicketTypes({ eventID, publishedAt }) {
        if (!eventID || !publishedAt) {
            throw new AppError({
                message: "Event ID and Published At timestamp are required.",
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
            });
        }

        const resourceKey = this.LOCK_KEYS.EVENT_TICKETS(eventID);
        return this.redisLockService.executeWithLock(resourceKey, async () => {
            console.log(
                `Lock acquired for resource: ${resourceKey}. Starting publish transaction for event ${eventID}.`,
            );

            let updatedTicketTypeIDs = [];

            await this.db.runTransaction(async (transaction) => {
                const ticketTypesQuery = this.ticketTypeCollection.where(
                    "eventID",
                    "==",
                    eventID,
                );

                const querySnapshot = await transaction.get(ticketTypesQuery);

                if (querySnapshot.empty) {
                    console.warn(
                        `No ticket types found for event ${eventID}. Nothing to publish.`,
                    );
                    return;
                }

                const docsToUpdate = [];
                querySnapshot.forEach((doc) => {
                    const ticketData = doc.data();

                    if (!ticketData.publishedAt) {
                        docsToUpdate.push({ ref: doc.ref, id: doc.id });
                    }
                });

                if (docsToUpdate.length === 0) {
                    console.log(
                        `All ticket types for event ${eventID} have already been published.`,
                    );
                    return;
                }

                docsToUpdate.forEach((item) => {
                    transaction.update(item.ref, { publishedAt: publishedAt });
                    updatedTicketTypeIDs.push(item.id);
                });

                console.log(
                    `${updatedTicketTypeIDs.length} ticket types for event ${eventID} marked for publishing within transaction.`,
                );
            });

            if (updatedTicketTypeIDs.length > 0) {
                const cacheKey =
                    this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
                await this.redisService.del(cacheKey);
                console.log(
                    `Transaction successful. Cache invalidated for event ${eventID}.`,
                );

                // await this.ticketLifecycleEventService.sendTicketTypesPublished(
                //     {
                //         eventID,
                //         publishedAt: aPublishedAt,
                //         ticketTypeIDs: updatedTicketTypeIDs,
                //     },
                // );
            }

            return {
                success: true,
                eventID: eventID,
                publishedCount: updatedTicketTypeIDs.length,
            };
        });
    }

    async deleteTicketType(ticketTypeID, eventID) {
        if (!ticketTypeID) {
            throw new AppError({
                message: "Ticket Type ID is required.",
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
            });
        }

        const resourceKey = this.LOCK_KEYS.EVENT_TICKETS(eventID);
        return this.redisLockService.executeWithLock(resourceKey, async () => {
            console.log(
                `Lock acquired for resource: ${resourceKey}. Starting delete transaction.`,
            );

            let eventID;

            await this.db.runTransaction(async (transaction) => {
                const ticketRef = this.ticketTypeCollection.doc(ticketTypeID);
                const ticketDoc = await transaction.get(ticketRef);

                if (!ticketDoc.exists) {
                    const err = new Error(
                        `Cannot delete: Ticket type with ID ${ticketTypeID} not found.`,
                    );
                    err.code = "TICKET_NOT_FOUND";
                    throw err;
                }

                const ticketData = ticketDoc.data();
                eventID = ticketData.eventID; // Lấy eventID để xóa cache

                const soldQuantity =
                    ticketData.totalQuantity - ticketData.remainingQuantity;
                if (soldQuantity > 0) {
                    const err = new Error(
                        `Cannot delete ticket type ${ticketTypeID} because ${soldQuantity} ticket(s) have already been sold.`,
                    );
                    err.code = "CANNOT_DELETE_SOLD_TICKET_TYPE";
                    throw err;
                }

                transaction.delete(ticketRef);
                console.log(
                    `Ticket type ${ticketTypeID} marked for deletion within transaction.`,
                );
            });

            if (eventID) {
                const cacheKey =
                    this.CACHE_KEYS.TICKET_TYPES_BY_EVENTID(eventID);
                await this.redisService.del(cacheKey);
                console.log(
                    `Transaction successful. Cache invalidated for event ${eventID}.`,
                );
                await this.ticketLifecycleEventService.sendTicketTypeDeleted({
                    ticketTypeID,
                    eventID,
                });
            }

            return { success: true, id: ticketTypeID };
        });
    }

    async getTicketForAuth(ticketTypeID) {
        const ticketRef = this.ticketTypeCollection.doc(ticketTypeID);
        const doc = await ticketRef.get();

        if (!doc.exists) {
            return null;
        }

        return { eventID: doc.data().eventID };
    }
}
