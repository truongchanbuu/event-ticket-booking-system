import diff from "microdiff";
import {
    AppError,
    ERROR_CODE,
    REDIS_TTL,
} from "@event_ticket_booking_system/shared";
import { sanitizePublicEvent } from "../utils/sanitize.js";
import { EVENT_STATUS } from "../enums/event-status.js";
import {
    TICKET_TYPES_SUBCOLLECTION,
    ATTENDEES_SUBCOLLECTION,
    EVENT_CONTRIBUTORS_SUBCOLLECTION,
    EVENTS_COLLECTION,
} from "../config/constants/collection.js";
import { ATTENDEE_STATUS, AttendeeSchema } from "../models/attedee.schema.js";

export class EventService {
    constructor({
        logger,
        db,
        redisService,
        redisLockService,
        contributorService,
        eventLifecycleEventService,
    }) {
        console = logger;
        this.db = db;
        this.eventCollection = db.collection("events");
        this.contributorService = contributorService;
        this.redisService = redisService;
        this.redisLockService = redisLockService;
        this.eventLifecycleEventService = eventLifecycleEventService;

        this.CACHE_KEYS = {
            EVENT_BY_ID: (eventID) => `event:${eventID}`,
            EVENTS_BY_ORG_ID: (orgID) => `events:org:${orgID}`,

            EVENT_ATTENDEES_BY_PAGE: (eventID, params) =>
                `event:${eventID}:attendees:${JSON.stringify(params)}`,
            EVENT_ATTENDEE_COUNT: (eventID) =>
                `event:${eventID}:attendees:count`,

            EVENT_TICKET_TYPES_BY_ID: (eventID) =>
                `event:${eventID}:ticketTypes`,
            EVENT_CONTRIBUTORS_BY_ID: (eventID) =>
                `event:${eventID}:contributors`,
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
                    "organizer.organizerID",
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
                const docRef = this.eventCollection.doc(eventID);

                const results = await Promise.allSettled([
                    docRef.get(),
                    docRef.collection(EVENT_CONTRIBUTORS_SUBCOLLECTION).get(),
                ]);

                const [eventResult, contributorResult] = results;

                if (
                    eventResult.status === "rejected" ||
                    !eventResult.value.exists
                ) {
                    console.error(
                        `Failed to fetch event ${eventID} or it does not exist.`,
                    );
                    return null;
                }
                const eventData = eventResult.value.data();

                // 3. Xử lý contributors, nếu lỗi thì trả về mảng rỗng
                const eventContributors =
                    contributorResult.status === "fulfilled"
                        ? contributorResult.value.docs.map((doc) => ({
                              id: doc.id,
                              ...doc.data(),
                          }))
                        : [];

                if (contributorResult.status === "rejected") {
                    console.error(
                        `Failed to fetch contributors for event ${eventID}:`,
                        contributorResult.reason,
                    );
                }

                return { ...eventData, eventContributors };
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
        const { ticketTypes, eventContributors, ...restOfEventData } =
            eventData;

        const eventDocRef = this.eventCollection.doc();
        const eventID = eventDocRef.id;

        const now = new Date().toISOString();
        const newEvent = {
            ...restOfEventData,
            eventID,
            status: EVENT_STATUS.DRAFT,
            organizer: {
                organizerID: user.uid,
                name: user.name,
                photoUrl: user.picture,
            },
            stats: {
                participantCount: 0,
                checkInCount: 0,
                ticketSoldCount: 0,
                totalTickets:
                    ticketTypes && ticketTypes.length ? ticketTypes.length : 0,
            },
            startTime: new Date(eventData.startTime).toISOString(),
            endTime: new Date(eventData.endTime).toISOString(),
            createdAt: now,
        };

        try {
            await this.db.runTransaction(async (tx) => {
                tx.set(eventDocRef, newEvent);

                if (ticketTypes && ticketTypes.length > 0) {
                    const ticketTypesCollectionRef = eventDocRef.collection(
                        TICKET_TYPES_SUBCOLLECTION,
                    );
                    for (const ticketType of ticketTypes) {
                        const ticketTypeDocRef = ticketTypesCollectionRef.doc();
                        const newTicketType = {
                            ...ticketType,
                            ticketTypeID: ticketTypeDocRef.id,
                        };
                        tx.set(ticketTypeDocRef, newTicketType);
                    }
                }

                if (eventContributors && eventContributors.length > 0) {
                    const eventContributorsCollectionRef =
                        eventDocRef.collection(
                            EVENT_CONTRIBUTORS_SUBCOLLECTION,
                        );

                    const contributorPromises = eventContributors.map(
                        (contributor) =>
                            this.contributorService
                                .findOrCreate(contributor, tx)
                                .then((result) => ({
                                    ...result,
                                    originalData: contributor,
                                })),
                    );

                    const resolvedContributors =
                        await Promise.all(contributorPromises);

                    for (const resolved of resolvedContributors) {
                        const {
                            id: contributorID,
                            data: contributorData,
                            originalData,
                        } = resolved;

                        const linkData = {
                            contributorID,
                            name: contributorData.fullName,
                            profilePicture: contributorData.photoUrl,
                            role: originalData.role,
                            isHeadliner: originalData.isHeadliner,
                        };

                        const linkDocRef =
                            eventContributorsCollectionRef.doc(contributorID);
                        tx.set(linkDocRef, linkData);
                    }
                }
            });

            // Invalidate cache sau khi transaction thành công
            const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(user.uid);
            console.log(
                `[Cache Invalidate] Deleting key ${orgCacheKey} due to new event creation.`,
            );
            await this.redisService.del(orgCacheKey);

            return eventID;
        } catch (error) {
            console.error("Transaction failed:", error.message, error.stack);
            throw new Error(
                "Failed to create the event due to an internal error.",
            );
        }
    }

    async updateEvent(eventID, eventData) {
        delete eventData.eventID;

        const eventRef = this.eventCollection.doc(eventID);
        let updatedEvent = null;

        await this.redisLockService.executeWithLock(
            `event:${eventID}`,
            async () => {
                await this.db.runTransaction(async (tx) => {
                    const snap = await tx.get(eventRef);
                    if (!snap.exists) {
                        throw new AppError({
                            statusCode: 404,
                            message: "Event not found",
                        });
                    }

                    const existingEvent = snap.data();

                    this._validateEventUpdateRules(existingEvent, eventData);

                    if (
                        eventData.ticketTypes &&
                        eventData.ticketTypes.length > 0
                    ) {
                        eventData.ticketTypes = await this._validateTicketTypes(
                            existingEvent.ticketTypes,
                            eventData.ticketTypes,
                        );
                    }

                    const updateData = this._prepareUpdateData(eventData);

                    tx.update(eventRef, updateData);

                    updatedEvent = { ...existingEvent, ...updateData };
                });
            },
        );

        // Invalidate cache sau khi commit thành công
        const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            updatedEvent.organizerID,
        );
        console.info(
            `[Cache Invalidate] Deleting keys ${eventCacheKey} and ${orgCacheKey} due to update.`,
        );
        await this.redisService.del(eventCacheKey, orgCacheKey);

        return updatedEvent;
    }

    // TODO: TEST CANCELLED KAFKA MESSAGE (CHƯA TEST) & NOTIFICATION nhận và thông báo + PAYMENT nhận & refund
    async cancelEvent(eventID, actor, cancelReason = "No reason provided") {
        const { userID, username, email } = actor;
        const eventRef = this.eventCollection.doc(eventID);

        let cancelledEvent = null;
        const now = Date.now();

        await this.redisLockService.executeWithLock(
            `event:${eventID}`,
            async () => {
                await this.db.runTransaction(async (tx) => {
                    const snap = await tx.get(eventRef);
                    if (!snap.exists) {
                        throw new AppError({
                            statusCode: 404,
                            message: "Event not found",
                        });
                    }

                    const event = snap.data();
                    if (event.organizer.organizerID !== userID) {
                        throw new AppError({
                            statusCode: 403,
                            message:
                                "You are not allowed to cancel this event.",
                            errorCode: ERROR_CODE.FORBIDDEN,
                        });
                    }

                    if (event.status === EVENT_STATUS.CANCELLED) return;
                    const startTime = new Date(event.startTime).getTime();
                    if (startTime <= now) {
                        throw new AppError({
                            statusCode: 400,
                            message:
                                "Event has already started and cannot be cancelled.",
                        });
                    }

                    const updateData = {
                        status: EVENT_STATUS.CANCELLED,
                        cancelReason,
                        cancelledBy: userID,
                        cancelledByUsername: username ?? "unknown",
                        cancelledByEmail: email,
                        cancelledAt: new Date().toISOString(),
                    };

                    tx.update(eventRef, updateData);
                    cancelledEvent = { ...event, ...updateData };
                });
            },
        );

        // Invalidate cache
        const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            cancelledEvent.organizerID,
        );
        await this.redisService.del(eventCacheKey, orgCacheKey);

        const attendeesCount = await this.countEventAttendees(eventID);
        if (attendeesCount > 0) {
            await this.eventLifecycleEventService.sendEventCancelled({
                cancelReason,
                cancelledBy: userID,
                cancelledByUsername: username,
                cancelledByEmail: email,
                eventID: eventID,
            });
        }

        return cancelledEvent;
    }

    _validateEventUpdateRules(existingEvent, eventData) {
        if (existingEvent.status === EVENT_STATUS.CANCELLED) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
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
        if (updateData.startTime) {
            updateData.startTime = new Date(updateData.startTime).toISOString();
        }

        if (updateData.endTime) {
            updateData.endTime = new Date(updateData.endTime).toISOString();
        }

        updateData.updatedAt = new Date().toISOString();

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
            }
        });

        return updateData;
    }

    async getEventAttendees(eventID, params = {}) {
        if (!eventID) {
            console.warn("[getEventAttendees] eventID is required.");
            return null;
        }

        const {
            limit = 10,
            startAfter,
            sortBy = "checkInTime",
            sortOrder = "asc",
            search,
        } = params;

        const allowedOrderBy = ["checkInTime", "displayName", "email"];
        const finalSortBy = allowedOrderBy.includes(sortBy)
            ? sortBy
            : "checkInTime";
        const finalSortOrder = ["asc", "desc"].includes(sortOrder)
            ? sortOrder
            : "asc";

        const cacheParams = { ...params };
        if (startAfter && typeof startAfter === "object") {
            cacheParams.startAfter = startAfter.id;
        }
        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEES_BY_PAGE(
            eventID,
            cacheParams,
        );

        const fetchFromDatabase = async () => {
            console.info(
                `[CACHE MISS] Fetching attendees for event ${eventID} from database.`,
            );
            try {
                let queryRef = this.eventCollection
                    .doc(eventID)
                    .collection(ATTENDEES_SUBCOLLECTION);

                if (search && search.length > 2) {
                    const normalizedQuery = searchQuery
                        .toLowerCase()
                        .split(" ")[0];
                    queryRef = queryRef.where(
                        "searchableKeywords",
                        "array-contains",
                        normalizedQuery,
                    );
                }

                queryRef = queryRef
                    .orderBy(finalSortBy, finalSortOrder)
                    .limit(limit + 1);

                if (startAfter) {
                    queryRef = queryRef.startAfter(startAfter);
                }

                const snapshot = await queryRef.get();

                if (snapshot.empty) {
                    return {
                        success: true,
                        data: [],
                        metadata: {
                            hasMore: false,
                            limit: limit,
                            nextCursor: null,
                        },
                    };
                }
                const hasMore = snapshot.docs.length > limit;
                const attendeesDocs = hasMore
                    ? snapshot.docs.slice(0, limit)
                    : snapshot.docs;
                const lastVisible =
                    attendeesDocs[attendeesDocs.length - 1] || null;

                const attendees = attendeesDocs
                    .map((doc) => {
                        const rawData = {
                            attendeeID: doc.id,
                            ...doc.data(),
                        };

                        // **Xác thực với Zod**
                        const validation = AttendeeSchema.safeParse(rawData);
                        if (!validation.success) {
                            console.warn(
                                `Invalid attendee data in DB (doc ID: ${doc.id}). Skipping.`,
                                { errors: validation.error.flatten() },
                            );
                            return null;
                        }
                        return validation.data;
                    })
                    .filter(Boolean);

                return {
                    success: true,
                    data: attendees,
                    metadata: {
                        limit: limit,
                        hasMore: hasMore,
                        nextCursor: lastVisible || null,
                    },
                };
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

    async countEventAttendees(eventID) {
        if (!eventID) {
            console.warn("[countEventAttendees] eventID is required.");
            return null;
        }

        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEE_COUNT(eventID);

        const fetchFromDatabase = async () => {
            console.info(
                `[CACHE MISS] Counting attendees for event ${eventID}...`,
            );

            try {
                const snapshot = await this.eventCollection
                    .doc(eventID)
                    .collection(ATTENDEES_SUBCOLLECTION)
                    .count()
                    .get();

                const count = snapshot.data()?.count ?? 0;

                return count;
            } catch (error) {
                console.error(
                    `Failed to count attendees for event ${eventID}`,
                    {
                        error: error.message,
                    },
                );
                return 0;
            }
        };

        return this.redisService.getOrSet(
            cacheKey,
            fetchFromDatabase,
            REDIS_TTL.EVENT_DEFAULT,
        );
    }

    async createEventAttendee(eventID, inputData) {
        if (!eventID) {
            console.warn("[createEventAttendee] eventID is required.");
            return { success: false, message: "Event ID is required." };
        }

        const validation = AttendeeSchema.safeParse(inputData);
        if (!validation.success) {
            console.warn(
                "[createEventAttendee] Invalid input data.",
                validation.error.flatten(),
            );
            return new AppError({
                errorCode: ERROR_CODE.INVALID_DATA,
                errors: validation.error,
                message: "Invalid Data",
            });
        }

        const { displayName, email, manually, attendeeStatus, quantity } =
            validation.data;

        try {
            const initialSearchableKeywords = [
                ...new Set([
                    ...displayName.toLowerCase().split(" "),
                    email.toLowerCase(),
                ]),
            ];

            const now = new Date().toISOString();
            const status =
                manually && attendeeStatus
                    ? attendeeStatus
                    : ATTENDEE_STATUS.REGISTERED;
            const checkInTime =
                status === ATTENDEE_STATUS.CHECKED_IN ? now : null;

            const newAttendeeDoc = {
                eventID: eventID,
                displayName: displayName,
                email: email,
                attendeeStatus: status,
                checkInTime,
                searchableKeywords: initialSearchableKeywords,
                joinedAt: now,
            };

            const newDocRef = await this.eventCollection
                .doc(eventID)
                .collection(ATTENDEES_SUBCOLLECTION)
                .add(newAttendeeDoc);

            const newAttendeeID = newDocRef.id;

            await newDocRef.update({
                searchableKeywords: firebase.firestore.FieldValue.arrayUnion(
                    newAttendeeID.toLowerCase(),
                ),
            });

            console.info(
                `Invalidating cache for event ${eventID} due to new attendee.`,
            );
            await this.invalidateEventAttendeesCache(eventID);

            const finalDoc = await newDocRef.get();
            const createdAttendee = {
                attendeeID: finalDoc.id,
                ...finalDoc.data(),
            };

            // if (manually && quantity > 1) {
            //     await this.eventLifecycleEventService.sendAttendeeCreated({
            //         attendeeID: finalDoc.id,
            //         eventID,
            //         email,
            //         displayName,
            //         manually,
            //     });
            // } else {
            // }

            console.info(
                `Successfully created attendee ${newAttendeeID} for event ${eventID}.`,
            );
            return { success: true, data: createdAttendee };
        } catch (error) {
            console.error(`Failed to create attendee for event ${eventID}`, {
                message: error.message,
            });

            return null;
        }
    }

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

    /// Contributor
    async createContributor(eventID, contributorData) {
        try {
            if (!eventID) {
                throw new Error("Event ID là bắt buộc.");
            }

            const contributorsSubCollectionRef = this.eventCollection
                .doc(eventID)
                .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION);

            const newContributorDocRef = contributorsSubCollectionRef.doc();
            const newContributorID = newContributorDocRef.id;

            const finalContributorData = {
                ...contributorData,
                contributorID: newContributorID,
            };

            await newContributorDocRef.set(finalContributorData);

            const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
            const contributorCacheKey =
                this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID);

            await this.redisService.del(eventCacheKey, contributorCacheKey);

            return finalContributorData;
        } catch (error) {
            console.error("Lỗi khi tạo contributor bằng Admin SDK:", error);
            throw new Error("Cannot create contributor.");
        }
    }

    async updateContributor(eventID, contributorID, data) {
        try {
            const contributorRef = this.eventCollection
                .doc(eventID)
                .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
                .doc(contributorID);

            await this.db.runTransaction(async (tx) => {
                const contributorDoc = await tx.get(contributorRef);

                if (!contributorDoc.exists) {
                    tx.set(contributorRef, data);
                } else {
                    tx.update(contributorRef, data);
                }

                return data;
            });

            console.log(`Invalidating caches for event ${eventID}...`);
            const keysToInvalidate = [
                this.CACHE_KEYS.EVENT_BY_ID(eventID),
                this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
            ];

            await this.redisService.del(...keysToInvalidate);
            console.log(`Caches invalidated successfully.`);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async removeContributor(eventID, contributorID, userID) {
        const lockResourceKey = `event:${eventID}:contributors`;

        try {
            await this.redisLockService.executeWithLock(
                lockResourceKey,
                async () => {
                    console.log(
                        `[Lock Acquired] Processing removal for contributor ${contributorID} from event ${eventID}.`,
                    );

                    const eventRef = this.eventCollection.doc(eventID);
                    const contributorRef = eventRef
                        .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
                        .doc(contributorID);

                    await this.db.runTransaction(async (transaction) => {
                        const eventDoc = await transaction.get(eventRef);
                        const contributorDoc =
                            await transaction.get(contributorRef);

                        if (!eventDoc.exists) {
                            throw new AppError({
                                message: `Event with ID ${eventID} not found.`,
                                statusCode: 404,
                                errorCode: ERROR_CODE.NOT_FOUND,
                            });
                        }

                        const eventData = eventDoc.data();
                        if (eventData.organizer.organizerID !== userID) {
                            throw new AppError({
                                message:
                                    "You do not have permission to modify this event.",
                                statusCode: 403,
                                errorCode: ERROR_CODE.FORBIDDEN,
                            });
                        }

                        if (!contributorDoc.exists) {
                            const err = new AppError({
                                message: `Contributor with ID ${contributorID} not found in event ${eventID}.`,
                                statusCode: 404,
                                errorCode: ERROR_CODE.NOT_FOUND,
                            });

                            throw err;
                        }

                        transaction.delete(contributorRef);
                        console.log(
                            `Contributor ${contributorID} marked for deletion in transaction.`,
                        );
                    });

                    console.log(
                        `[Firestore Transaction Success] Contributor ${contributorID} removed.`,
                    );
                },
            );

            console.log(`Invalidating caches for event ${eventID}...`);
            const keysToInvalidate = [
                this.CACHE_KEYS.EVENT_BY_ID(eventID),
                this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
            ];

            await this.redisService.del(...keysToInvalidate);
            console.log(`Caches invalidated successfully.`);

            return { success: true };
        } catch (error) {
            console.error(
                `Failed to remove contributor ${contributorID} from event ${eventID}:`,
                error,
            );
            throw error;
        }
    }

    // ======== HELPER ========
    async invalidateEventAttendeesCache(eventID) {
        if (!eventID) return;
        const prefix = `event:${eventID}:attendees`;
        await this.redisService.invalidateKeysByPrefix(prefix);
    }
}
