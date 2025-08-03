import diff from "microdiff";
import { AppError, db, REDIS_TTL } from "@event_ticket_booking_system/shared";
import { sanitizePublicEvent } from "../utils/sanitize.js";
import { EVENT_STATUS } from "../enums/event-status.js";

const EVENT_COLLECTION = "events";
const ATTENDEES_SUBCOLLECTION = "attendees";
const TICKET_TYPES_SUBCOLLECTION = "ticketTypes";

export class EventService {
    constructor({ logger, redisService }) {
        console = logger;
        this.eventCollection = db.collection("events");
        this.redisService = redisService;

        this.CACHE_KEYS = {
            EVENT_BY_ID: (eventID) => `event:${eventID}`,
            EVENTS_BY_ORG_ID: (orgID) => `events:org:${orgID}`,
            EVENT_ATTENDEES_BY_ID: (eventID) => `event:${eventID}:attendees`,
            EVENT_TICKET_TYPES_BY_ID: (eventID) =>
                `event:${eventID}:ticketTypes`,
        };
    }

    async getAllEvents(options = {}) {
        const {
            limit = 20,
            orderBy = "createdAt",
            sortOrder = "desc",
            status = null,
            lastVisibleValue = null,
            isDeleted = false,
        } = options;

        let query = this.eventCollection;

        if (status) {
            query = query.where("status", "==", status);
        }

        if (!isDeleted) {
            query = query.where("isDeleted", "!=", true);
        }

        query = query.orderBy(orderBy, sortOrder);

        if (lastVisibleValue) {
            query = query.startAfter(lastVisibleValue);
        }

        query = query.limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            return {
                events: [],
                hasMore: false,
                lastDoc: null,
                total: 0,
            };
        }

        const events = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            startTime: doc.data().startTime?.toDate(),
            endTime: doc.data().endTime?.toDate(),
        }));

        return {
            events,
            hasMore: snapshot.docs.length === limit,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            total: snapshot.docs.length,
        };
    }

    async getEventsByOrgID(orgID) {
        const cacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(orgID);

        const eventsFromCacheOrDB = await this.redisService.getOrSet(
            cacheKey,
            async () => {
                console.log(
                    `[Cache Miss] Fetching events for orgID ${orgID} from Firestore.`,
                );

                const query = this.eventCollection.where(
                    "organizerID",
                    "==",
                    orgID,
                );
                const snap = await query.get();

                if (snap.empty) {
                    return [];
                }

                return snap.docs.map((doc) => doc.data());
            },
            REDIS_TTL.EVENT_DEFAULT,
        );

        if (!eventsFromCacheOrDB || eventsFromCacheOrDB.length === 0) {
            return [];
        }

        return eventsFromCacheOrDB;
    }

    async getEventByID(eventID, isPublic = true) {
        const cacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);

        const eventFromCacheOrDB = await this.redisService.getOrSet(
            cacheKey,
            async () => {
                console.log(
                    `[Cache Miss] Fetching eventID ${eventID} from Firestore.`,
                );
                const docRef = this.eventCollection.doc(eventID);
                const doc = await docRef.get();

                if (!doc.exists) {
                    return null;
                }

                return doc.data();
            },
            REDIS_TTL.EVENT_DEFAULT,
        );

        if (!eventFromCacheOrDB) {
            return null;
        }

        return isPublic
            ? sanitizePublicEvent(eventFromCacheOrDB)
            : eventFromCacheOrDB;
    }

    async createEvent(user, eventData) {
        console.log(
            `EVENT DATA: ${JSON.stringify(eventData)} - user: ${JSON.stringify(user)}`,
        );
        const eventDocRef = this.eventCollection.doc();
        const eventID = eventDocRef.id;

        eventData.status = EVENT_STATUS.DRAFT;

        const newEvent = {
            ...eventData,
            organizer: {
                organizerID: user.uid,
                name: user.name,
                phototUrl: user.picture,
            },
            stats: {
                participantCount: 0,
                checkInCount: 0,
                ticketSoldCount: 0,
            },
            eventID,
            startTime: new Date(eventData.startTime).toISOString(),
            endTime: new Date(eventData.endTime).toISOString(),
            createdAt: new Date().toISOString(),
        };

        await eventDocRef.set(newEvent);

        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            eventData.organizer.organizerID,
        );
        console.log(
            `[Cache Invalidate] Deleting key ${orgCacheKey} due to new event creation.`,
        );
        await this.redisService.del(orgCacheKey);

        return eventID;
    }

    async updateEvent(eventID, eventData) {
        const existingEvent = await this.getEventByID(eventID, false);

        if (!existingEvent) {
            throw new AppError({ statusCode: 404, message: "Event not found" });
        }

        this._validateEventUpdateRules(existingEvent, eventData);
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
            eventData.ticketTypes = await this._validateTicketTypes(
                existingEvent.ticketTypes,
                eventData.ticketTypes,
            );
        }

        const updateData = this._prepareUpdateData(eventData);

        await this.eventCollection.doc(eventID).update(updateData);
        const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            existingEvent.organizerID,
        );

        console.info(
            `[Cache Invalidate] Deleting keys ${eventCacheKey} and ${orgCacheKey} due to update.`,
        );
        await this.redisService.del(...[eventCacheKey, orgCacheKey]);

        return { ...existingEvent, ...updateData };
    }

    _validateEventUpdateRules(existingEvent, eventData) {
        // Cannot update cancelled events
        if (existingEvent.status === EVENT_STATUS.CANCELLED) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_OPERATION,
                message: "Cannot update cancelled events",
            });
        }

        // Cannot change status from published to draft if there are participants
        if (
            existingEvent.status === EVENT_STATUS.PUBLISHED &&
            eventData.status === EVENT_STATUS.DRAFT &&
            existingEvent.participantCount > 0
        ) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_OPERATION,
                message:
                    "Cannot change published event to draft when there are participants",
            });
        }

        // Cannot update start/end time if event has already started
        const now = new Date();
        if (existingEvent.startTime <= now) {
            if (eventData.startTime || eventData.endTime) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_OPERATION,
                    message:
                        "Cannot update event times after event has started",
                });
            }
        }

        // Validate time constraints if both times are being updated
        if (eventData.startTime && eventData.endTime) {
            const startTime = new Date(eventData.startTime);
            const endTime = new Date(eventData.endTime);

            if (endTime <= startTime) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "End time must be after start time",
                });
            }
        }

        // Validate individual time updates against existing times
        if (eventData.startTime && !eventData.endTime) {
            const newStartTime = new Date(eventData.startTime);
            const existingEndTime = new Date(existingEvent.endTime);

            if (newStartTime >= existingEndTime) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "New start time must be before existing end time",
                });
            }
        }

        if (eventData.endTime && !eventData.startTime) {
            const newEndTime = new Date(eventData.endTime);
            const existingStartTime = new Date(existingEvent.startTime);

            if (newEndTime <= existingStartTime) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "New end time must be after existing start time",
                });
            }
        }
    }

    async _validateTicketTypes(current = [], updates = []) {
        if (!Array.isArray(current) || !Array.isArray(updates)) {
            throw new AppError({
                statusCode: 400,
                errorCode: "INVALID_INPUT",
                message: "ticketTypes must be arrays",
            });
        }

        const ticketMap = new Map();
        for (const ticket of current) {
            if (ticket?.ticketTypeID) {
                ticketMap.set(ticket.ticketTypeID, { ...ticket });
            }
        }

        let hasChanged = false;

        for (const update of updates) {
            const { ticketTypeID } = update;
            if (!ticketTypeID) continue;

            const existing = ticketMap.get(ticketTypeID);

            // Nếu chưa có → thay đổi chắc chắn
            if (!existing) {
                hasChanged = true;
                ticketMap.set(ticketTypeID, update);
                continue;
            }

            const merged = { ...existing, ...update };

            const changes = diff(existing, merged);
            if (changes.length > 0) {
                hasChanged = true;
                ticketMap.set(ticketTypeID, merged);
            }
        }

        const mergedArray = Array.from(ticketMap.values());

        // Optional: bạn có thể kiểm tra thêm phần chiều dài nếu muốn chắc chắn
        if (!hasChanged && mergedArray.length === current.length) {
            return current;
        }

        return mergedArray;
    }

    _prepareUpdateData(eventData) {
        const updateData = { ...eventData };

        // Convert timestamps if provided
        if (updateData.startTime) {
            updateData.startTime = new Date(updateData.startTime);
        }

        if (updateData.endTime) {
            updateData.endTime = new Date(updateData.endTime);
        }

        // Add updated timestamp
        updateData.updatedAt = new Date().toISOString();

        // Remove undefined/null values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
            }
        });

        return updateData;
    }

    /**
     * Lấy danh sách người tham dự của một sự kiện, có sử dụng Redis cache.
     * @param {string} eventID - ID của sự kiện.
     * @returns {Promise<Array<Object>|null>} Danh sách người tham dự.
     */
    async getEventAttendees(eventID) {
        if (!eventID) {
            console.warn("[getEventAttendees] eventID is required.");
            return null;
        }

        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEES_BY_ID(eventID);

        const fetchFromDatabase = async () => {
            console.info(
                `[CACHE MISS] Fetching attendees for event ${eventID} from database.`,
            );

            try {
                const attendeesCollectionRef = this.eventCollection
                    .doc(eventID)
                    .collection(ATTENDEES_SUBCOLLECTION);

                const snapshot = await attendeesCollectionRef.get();

                if (snapshot.empty) {
                    console.info(
                        `No attendees found for event ${eventID} in Firestore.`,
                    );
                    return [];
                }

                const attendees = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    const joinedAtTimestamp = data.joinedAt;

                    return {
                        userID: doc.id,
                        displayName: data.displayName,
                        avatarUrl: data.avatarUrl,
                        status: data.status, // Giả sử có trường status
                        // Chuyển đổi Timestamp của Firestore sang một định dạng có thể serialize được (ví dụ: ISO string)
                        joinedAt: joinedAtTimestamp?.toDate
                            ? joinedAtTimestamp.toDate().toISOString()
                            : null,
                    };
                });

                return attendees;
            } catch (error) {
                console.error(
                    `Failed to fetch attendees from DB for event ${eventID}`,
                    { error: error.message },
                );
                return null;
            }
        };

        return this.redisService.getOrSet(
            cacheKey,
            fetchFromDatabase,
            REDIS_TTL.EVENT_DEFAULT,
        );
    }

    /**
     * Khi có một hành động làm thay đổi danh sách người tham dự (ví dụ: có người mới tham gia),
     * chúng ta cần xóa cache cũ đi để lần gọi tiếp theo sẽ lấy dữ liệu mới nhất từ DB.
     * @param {string} eventID - ID của sự kiện.
     * @param {string} userID - ID của người dùng tham gia.
     */
    /**
     * Thêm một người dùng vào danh sách người tham dự của một sự kiện
     * trong Firestore và làm mới cache trong Redis.
     *
     * @param {string} eventID - ID của sự kiện (document trong collection 'events').
     * @param {string} userID - ID của người dùng để làm ID cho document trong subcollection.
     * @param {object} attendeeData - Dữ liệu của người dùng cần lưu trữ.
     * @param {string} attendeeData.fullName - Tên đầy đủ của người dùng.
     * @param {string} attendeeData.avatarUrl - URL ảnh đại diện của người dùng.
     * @returns {Promise<{success: boolean, error?: string}>} - Trả về trạng thái thành công hoặc thất bại.
     */
    async addUserToEvent(eventID, userID, attendeeData) {
        if (!eventID || !userID || !attendeeData) {
            const errorMsg =
                "addUserToEvent: eventID, userID, and attendeeData are required.";
            console.warn(errorMsg);
            return { success: false, error: errorMsg };
        }

        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEES_BY_ID(eventID);
        const attendeeRef = this.firestore
            .collection(EVENT_COLLECTION)
            .doc(eventID)
            .collection(ATTENDEES_SUBCOLLECTION)
            .doc(userID);

        try {
            console.info(
                `Adding user ${userID} to event ${eventID} in Firestore.`,
            );

            await attendeeRef.set({
                ...attendeeData,
                joinedAt: new Date().toISOString(),
            });

            console.info(
                `Successfully added user ${userID} to event ${eventID}.`,
            );

            console.info(
                `[CACHE INVALIDATION] Deleting cache for key: ${cacheKey}`,
            );

            await this.redisService.del(cacheKey);

            return { success: true };
        } catch (error) {
            console.error(`Failed to add user ${userID} to event ${eventID}.`, {
                error: error.message,
                eventID,
                userID,
            });

            return {
                success: false,
                error: "Failed to update event attendees.",
            };
        }
    }

    /**
     * Lấy danh sách các loại vé (ticket types) của một sự kiện
     * @param {string} eventID - ID của sự kiện.
     * @returns {Promise<Array<Object>|null>} Danh sách các loại vé hoặc null nếu có lỗi.
     */
    async getEventTicketTypes(eventID) {
        if (!eventID) {
            console.warn("[getEventTicketTypes] eventID is required.");
            return null;
        }

        const cacheKey = this.CACHE_KEYS.EVENT_TICKET_TYPES_BY_ID(eventID);

        const fetchFromDatabase = async () => {
            console.info(
                `[CACHE MISS] Fetching ticket types for event ${eventID} from Firestore.`,
            );
            try {
                const ticketTypesCollectionRef = this.eventCollection
                    .doc(eventID)
                    .collection(TICKET_TYPES_SUBCOLLECTION);

                const snapshot = await ticketTypesCollectionRef.get();

                if (snapshot.empty) {
                    console.info(`No ticket types found for event ${eventID}.`);
                    return [];
                }

                const ticketTypes = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                return ticketTypes;
            } catch (error) {
                console.error(
                    `Failed to fetch ticket types from Firestore for event ${eventID}`,
                    { error: error.message },
                );
                return null;
            }
        };

        return this.redisService.getOrSet(
            cacheKey,
            fetchFromDatabase,
            REDIS_TTL.TICKET_TYPES_DEFAULT,
        );
    }

    /**
     * Tạo một loại vé mới cho sự kiện.
     * @param {string} eventID - ID của sự kiện.
     * @param {object} ticketTypeData - Dữ liệu của loại vé mới.
     */
    async createTicketType(eventID, ticketTypeData) {
        try {
            const ticketTypesCollectionRef = this.eventCollection
                .doc(eventID)
                .collection(TICKET_TYPES_SUBCOLLECTION);

            const docRef = await ticketTypesCollectionRef.add(ticketTypeData);
            console.info(
                `Successfully created new ticket type with ID: ${docRef.id}`,
            );

            const cacheKey = this.CACHE_KEYS.EVENT_TICKET_TYPES_BY_ID(eventID);
            console.info(
                `[CACHE INVALIDATION] Deleting cache for key: ${cacheKey}`,
            );
            await this.redisService.del(cacheKey);

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error(`Failed to create ticket type for event ${eventID}`, {
                error: error.message,
            });
            return { success: false, error: "Failed to create ticket type." };
        }
    }
}
