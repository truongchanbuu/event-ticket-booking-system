import diff from "microdiff";
import {
    AppError,
    ERROR_CODE,
    REDIS_TTL,
    stableStringify,
    FieldValue,
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
        db,
        redisService,
        redisLockService,
        contributorService,
        ticketClientService,
        eventLifecycleEventService,
        logger = null,
    }) {
        this.db = db;
        this.eventCollection = db.collection(EVENTS_COLLECTION || "events");
        this.redisService = redisService;
        this.redisLockService = redisLockService;
        this.contributorService = contributorService;
        this.ticketClientService = ticketClientService;
        this.eventLifecycleEventService = eventLifecycleEventService;
        this.logger = logger;

        this.CACHE_KEYS = {
            EVENT_BY_ID: (eventID) => `event:${eventID}`,
            EVENTS_BY_ORG_ID: (orgID) => `events:org:${orgID}`,
            EVENT_ATTENDEES_BY_PAGE: (eventID, params) =>
                `event:${eventID}:attendees:${stableStringify(params)}`,
            EVENT_ATTENDEE_COUNT: (eventID) =>
                `event:${eventID}:attendees:count:${eventID}`,
            EVENT_TICKET_TYPES_BY_ID: (eventID) =>
                `event:${eventID}:ticketTypes:${eventID}`,
            EVENT_CONTRIBUTORS_BY_ID: (eventID) =>
                `event:${eventID}:contributors:${eventID}`,
        };
    }

    _nowISO() {
        return new Date().toISOString();
    }

    _getFieldValue() {
        return FieldValue;
    }

    // -----------------------
    // Events: CRUD + publish/cancel
    // -----------------------
    async getAllEvents(options = {}) {
        const {
            limit = 20,
            orderBy = "createdAt",
            sortOrder = "desc",
            status = null,
            lastVisibleValue = null,
            isDeleted = false,
        } = options;

        try {
            let query = this.eventCollection;

            if (status) query = query.where("status", "==", status);
            if (!isDeleted) query = query.where("isDeleted", "!=", true);

            query = query.orderBy(orderBy, sortOrder);

            if (lastVisibleValue) query = query.startAfter(lastVisibleValue);

            query = query.limit(limit);

            const snapshot = await query.get();

            if (snapshot.empty) {
                return { events: [], hasMore: false, lastDoc: null, total: 0 };
            }

            const events = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    eventID: doc.id,
                    ...data,
                    createdAt: data.createdAt ? new Date(data.createdAt) : null,
                    updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
                    startTime: data.startTime ? new Date(data.startTime) : null,
                    endTime: data.endTime ? new Date(data.endTime) : null,
                };
            });

            return {
                events,
                hasMore: snapshot.docs.length === limit,
                lastDoc: snapshot.docs[snapshot.docs.length - 1],
                total: snapshot.docs.length,
            };
        } catch (err) {
            console.error("[getAllEvents] error:", err);
            throw err;
        }
    }

    async getEventsByOrgID(orgID) {
        if (!orgID) return [];
        const cacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(orgID);

        const fetchFromDb = async () => {
            console.log(
                `[Cache Miss] Fetching events for orgID ${orgID} from Firestore.`,
            );
            const query = this.eventCollection.where(
                "organizer.organizerID",
                "==",
                orgID,
            );
            const snap = await query.get();
            if (snap.empty) return [];
            return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        };

        try {
            const events = await this.redisService.getOrSet(
                cacheKey,
                fetchFromDb,
                REDIS_TTL.EVENT_DEFAULT,
            );
            if (!events || events.length === 0) return [];
            return events;
        } catch (err) {
            console.error("[getEventsByOrgID] Redis error:", err);
            return fetchFromDb();
        }
    }

    async getEventByID(eventID, isPublic = true) {
        if (!eventID) return null;
        const cacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);

        const fetchFromDB = async () => {
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
            const eventContributors =
                contributorResult.status === "fulfilled"
                    ? contributorResult.value.docs.map((d) => ({
                          id: d.id,
                          ...d.data(),
                      }))
                    : [];

            if (contributorResult.status === "rejected") {
                console.error(
                    `Failed to fetch contributors for event ${eventID}:`,
                    contributorResult.reason,
                );
            }

            return { ...eventData, eventContributors };
        };

        try {
            const eventFromCacheOrDB = await this.redisService.getOrSet(
                cacheKey,
                fetchFromDB,
                REDIS_TTL.EVENT_DEFAULT,
            );
            if (!eventFromCacheOrDB) return null;
            return isPublic
                ? sanitizePublicEvent(eventFromCacheOrDB)
                : eventFromCacheOrDB;
        } catch (err) {
            console.error("[getEventByID] Redis error:", err);
            const raw = await fetchFromDB();
            return isPublic ? sanitizePublicEvent(raw) : raw;
        }
    }

    async createEvent(user, eventData) {
        if (!user || !user.uid)
            throw new AppError({ statusCode: 401, message: "Unauthorized" });

        const { ticketTypes = [], eventContributors = [], ...rest } = eventData;
        const eventDocRef = this.eventCollection.doc();
        const eventID = eventDocRef.id;
        const now = this._nowISO();

        // Resolve contributors OUTSIDE transaction to avoid external calls in transaction
        let resolvedContributors = [];
        if (Array.isArray(eventContributors) && eventContributors.length) {
            try {
                const contributorPromises = eventContributors.map((c) =>
                    this.contributorService
                        .findOrCreate(c)
                        .then((res) => ({ ...res, originalData: c })),
                );
                resolvedContributors = await Promise.all(contributorPromises);
            } catch (err) {
                console.error(
                    "[createEvent] failed resolving contributors:",
                    err,
                );
                throw new Error("Failed to resolve contributors");
            }
        }

        const newEvent = {
            ...rest,
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
                totalTickets: Array.isArray(ticketTypes)
                    ? ticketTypes.length
                    : 0,
            },
            startTime: eventData.startTime
                ? new Date(eventData.startTime).toISOString()
                : null,
            endTime: eventData.endTime
                ? new Date(eventData.endTime).toISOString()
                : null,
            createdAt: now,
            updatedAt: now,
        };

        try {
            await this.db.runTransaction(async (tx) => {
                tx.set(eventDocRef, newEvent);

                if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
                    const tcol = eventDocRef.collection(
                        TICKET_TYPES_SUBCOLLECTION,
                    );
                    for (const tt of ticketTypes) {
                        const tdRef = tcol.doc();
                        const newTicketType = { ...tt, ticketTypeID: tdRef.id };
                        tx.set(tdRef, newTicketType);
                    }
                }

                if (resolvedContributors.length > 0) {
                    const ccol = eventDocRef.collection(
                        EVENT_CONTRIBUTORS_SUBCOLLECTION,
                    );
                    for (const resolved of resolvedContributors) {
                        const {
                            id: contributorID,
                            data: contributorData,
                            originalData,
                        } = resolved;
                        const linkData = {
                            contributorID,
                            name:
                                contributorData?.fullName ??
                                originalData?.name ??
                                "unknown",
                            profilePicture:
                                contributorData?.photoUrl ??
                                originalData?.photoUrl ??
                                null,
                            role: originalData?.role ?? null,
                            isHeadliner: originalData?.isHeadliner ?? false,
                        };
                        const linkDocRef = ccol.doc(contributorID);
                        tx.set(linkDocRef, linkData);
                    }
                }
            });

            const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(user.uid);
            console.log(
                `[Cache Invalidate] Deleting key ${orgCacheKey} due to new event creation.`,
            );
            await this.redisService.del(orgCacheKey);

            return eventID;
        } catch (error) {
            console.error(
                "Transaction failed:",
                error?.message ?? error,
                error?.stack ?? "",
            );
            throw new Error(
                "Failed to create the event due to an internal error.",
            );
        }
    }

    async updateEvent(eventID, eventData, actor = null) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const eventRef = this.eventCollection.doc(eventID);
        let updatedEvent = null;

        await this.redisLockService.executeWithLock(
            `event:${eventID}`,
            async () => {
                await this.db.runTransaction(async (tx) => {
                    const snap = await tx.get(eventRef);
                    if (!snap.exists)
                        throw new AppError({
                            statusCode: 404,
                            message: "Event not found",
                        });

                    const existingEvent = snap.data();

                    if (
                        actor &&
                        actor.userID &&
                        existingEvent.organizer?.organizerID !== actor.userID
                    ) {
                        throw new AppError({
                            statusCode: 403,
                            message: "Unauthorized to update this event",
                            errorCode: ERROR_CODE.FORBIDDEN,
                        });
                    }

                    this._validateEventUpdateRules(existingEvent, eventData);

                    if (
                        eventData.ticketTypes &&
                        Array.isArray(eventData.ticketTypes) &&
                        eventData.ticketTypes.length > 0
                    ) {
                        eventData.ticketTypes = await this._validateTicketTypes(
                            existingEvent.ticketTypes ?? [],
                            eventData.ticketTypes,
                        );
                    }

                    const updateData = this._prepareUpdateData(eventData);

                    tx.update(eventRef, updateData);
                    updatedEvent = { ...existingEvent, ...updateData };
                });
            },
        );

        const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            updatedEvent?.organizer?.organizerID ?? "unknown",
        );
        console.info(
            `[Cache Invalidate] Deleting keys ${eventCacheKey} and ${orgCacheKey} due to update.`,
        );
        await this.redisService.del(eventCacheKey, orgCacheKey);

        return updatedEvent;
    }

    async publishEvent(eventID, organizerID) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });
        if (!organizerID)
            throw new AppError({
                statusCode: 400,
                message: "organizerID is required",
            });

        const eventTicketTypes =
            await this.ticketClientService.getEventTicketTypes(eventID);
        if (!Array.isArray(eventTicketTypes) || eventTicketTypes.length === 0) {
            throw new AppError({
                message:
                    "An event must have at least one ticket type before it can be published.",
                errorCode: ERROR_CODE.INVALID_DATA,
                statusCode: 400,
            });
        }

        const eventRef = this.eventCollection.doc(eventID);
        let eventData = null;

        await this.db.runTransaction(async (tx) => {
            const eventDoc = await tx.get(eventRef);
            if (!eventDoc.exists)
                throw new AppError({
                    message: "Event Not Found.",
                    errorCode: ERROR_CODE.NOT_FOUND,
                    statusCode: 404,
                });

            const event = eventDoc.data();
            eventData = event;

            if (event.organizer?.organizerID !== organizerID)
                throw new AppError({
                    message: "Unauthorized",
                    errorCode: ERROR_CODE.UNAUTHORIZED,
                    statusCode: 401,
                });

            if (event.status === EVENT_STATUS.PUBLISHED)
                throw new AppError({
                    message: "This event has already been published.",
                    errorCode: ERROR_CODE.INVALID_OPERATION,
                    statusCode: 400,
                });

            if (event.startTime && new Date(event.startTime) < new Date())
                throw new AppError({
                    message: "Cannot publish an event that has already passed.",
                    errorCode: ERROR_CODE.INVALID_DATA,
                    statusCode: 400,
                });

            tx.update(eventRef, {
                status: EVENT_STATUS.PUBLISHED,
                publishedAt: this._nowISO(),
                updatedAt: this._nowISO(),
            });
        });

        if (eventData) {
            const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
            const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
                eventData.organizer?.organizerID ?? "unknown",
            );
            console.info(
                `[Cache Invalidate] Deleting keys ${eventCacheKey} and ${orgCacheKey} due to publish.`,
            );
            await this.redisService.del(eventCacheKey, orgCacheKey);

            await this.eventLifecycleEventService.sendEventPublished({
                eventID,
                organizerID,
                ...eventData,
            });
        } else {
            console.error(
                "Transaction succeeded but eventData was not captured.",
                { eventID },
            );
        }
    }

    async cancelEvent(eventID, actor, cancelReason = "No reason provided") {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });
        if (!actor || !actor.userID)
            throw new AppError({
                statusCode: 401,
                message: "actor is required",
            });

        const { userID, username, email } = actor;
        const eventRef = this.eventCollection.doc(eventID);
        let cancelledEvent = null;
        const now = Date.now();

        await this.redisLockService.executeWithLock(
            `event:${eventID}`,
            async () => {
                await this.db.runTransaction(async (tx) => {
                    const snap = await tx.get(eventRef);
                    if (!snap.exists)
                        throw new AppError({
                            statusCode: 404,
                            message: "Event not found",
                        });

                    const event = snap.data();
                    if (event.organizer?.organizerID !== userID)
                        throw new AppError({
                            statusCode: 403,
                            message:
                                "You are not allowed to cancel this event.",
                            errorCode: ERROR_CODE.FORBIDDEN,
                        });

                    if (event.status === EVENT_STATUS.CANCELLED) {
                        cancelledEvent = event;
                        return;
                    }

                    const startTime = event.startTime
                        ? new Date(event.startTime).getTime()
                        : 0;
                    if (startTime <= now)
                        throw new AppError({
                            statusCode: 400,
                            message:
                                "Event has already started and cannot be cancelled.",
                        });

                    const updateData = {
                        status: EVENT_STATUS.CANCELLED,
                        cancelReason,
                        cancelledBy: userID,
                        cancelledByUsername: username ?? "unknown",
                        cancelledByEmail: email,
                        cancelledAt: this._nowISO(),
                        updatedAt: this._nowISO(),
                    };

                    tx.update(eventRef, updateData);
                    cancelledEvent = { ...event, ...updateData };
                });
            },
        );

        const eventCacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);
        const orgCacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(
            cancelledEvent.organizer?.organizerID ?? "unknown",
        );
        await this.redisService.del(eventCacheKey, orgCacheKey);

        const attendeesCount = await this.countEventAttendees(eventID);
        if (attendeesCount > 0) {
            await this.eventLifecycleEventService.sendEventCancelled({
                cancelReason,
                cancelledBy: userID,
                cancelledByUsername: username,
                cancelledByEmail: email,
                eventID,
            });
        }

        return cancelledEvent;
    }

    // -----------------------
    // Validation helpers
    // -----------------------
    _validateEventUpdateRules(existingEvent, eventData) {
        if (!existingEvent) return;

        if (existingEvent.status === EVENT_STATUS.CANCELLED) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
                message: "Cannot update cancelled events",
            });
        }

        const participantCount =
            existingEvent.stats?.participantCount ??
            existingEvent.participantCount ??
            0;
        if (
            existingEvent.status === EVENT_STATUS.PUBLISHED &&
            eventData.status === EVENT_STATUS.DRAFT &&
            participantCount > 0
        ) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_OPERATION,
                message:
                    "Cannot change published event to draft when there are participants",
            });
        }

        const now = new Date();
        const existingStart = existingEvent.startTime
            ? new Date(existingEvent.startTime)
            : null;
        const existingEnd = existingEvent.endTime
            ? new Date(existingEvent.endTime)
            : null;

        if (existingStart && existingStart <= now) {
            if (eventData.startTime || eventData.endTime) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_OPERATION,
                    message:
                        "Cannot update event times after event has started",
                });
            }
        }

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

        if (eventData.startTime && !eventData.endTime && existingEnd) {
            const newStartTime = new Date(eventData.startTime);
            if (newStartTime >= existingEnd) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "New start time must be before existing end time",
                });
            }
        }

        if (eventData.endTime && !eventData.startTime && existingStart) {
            const newEndTime = new Date(eventData.endTime);
            if (newEndTime <= existingStart) {
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
            if (ticket?.ticketTypeID)
                ticketMap.set(ticket.ticketTypeID, { ...ticket });
        }

        let hasChanged = false;
        for (const update of updates) {
            const { ticketTypeID } = update;
            if (!ticketTypeID) {
                hasChanged = true;
                ticketMap.set(
                    `__new_${Math.random().toString(36).slice(2, 9)}`,
                    { ...update },
                );
                continue;
            }

            const existing = ticketMap.get(ticketTypeID);
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
        if (!hasChanged && mergedArray.length === current.length)
            return current;
        return mergedArray;
    }

    _prepareUpdateData(eventData) {
        const updateData = { ...eventData };
        if (updateData.startTime)
            updateData.startTime = new Date(updateData.startTime).toISOString();
        if (updateData.endTime)
            updateData.endTime = new Date(updateData.endTime).toISOString();
        updateData.updatedAt = this._nowISO();
        Object.keys(updateData).forEach((k) => {
            if (updateData[k] === undefined || updateData[k] === null)
                delete updateData[k];
        });
        return updateData;
    }

    // -----------------------
    // Attendees: list/create/count/update/remove
    // -----------------------
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
        if (startAfter && typeof startAfter === "object")
            cacheParams.startAfter = startAfter.id || startAfter;
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

                if (search && typeof search === "string" && search.length > 2) {
                    const normalizedQuery = search.toLowerCase().split(" ")[0];
                    queryRef = queryRef.where(
                        "searchableKeywords",
                        "array-contains",
                        normalizedQuery,
                    );
                }

                queryRef = queryRef
                    .orderBy(finalSortBy, finalSortOrder)
                    .limit(limit + 1);

                if (startAfter) queryRef = queryRef.startAfter(startAfter);

                const snapshot = await queryRef.get();

                if (snapshot.empty) {
                    return {
                        success: true,
                        data: [],
                        metadata: { hasMore: false, limit, nextCursor: null },
                    };
                }

                const hasMore = snapshot.docs.length > limit;
                const docs = hasMore
                    ? snapshot.docs.slice(0, limit)
                    : snapshot.docs;
                const lastVisible = docs[docs.length - 1] || null;

                const attendees = docs
                    .map((doc) => {
                        const rawData = { attendeeID: doc.id, ...doc.data() };
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
                        limit,
                        hasMore,
                        nextCursor: lastVisible || null,
                    },
                };
            } catch (error) {
                console.error(
                    `Failed to fetch attendees from DB for event ${eventID}`,
                    { error: error.message },
                );
                return {
                    success: false,
                    data: [],
                    metadata: { limit, hasMore: false, nextCursor: null },
                };
            }
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDatabase,
                REDIS_TTL.EVENT_DEFAULT,
            );
        } catch (err) {
            console.error("[getEventAttendees] Redis error:", err);
            return fetchFromDatabase();
        }
    }

    async countEventAttendees(eventID) {
        if (!eventID) {
            console.warn("[countEventAttendees] eventID is required.");
            return 0;
        }

        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEE_COUNT(eventID);

        const fetchFromDatabase = async () => {
            console.info(
                `[CACHE MISS] Counting attendees for event ${eventID}...`,
            );
            try {
                const colRef = this.eventCollection
                    .doc(eventID)
                    .collection(ATTENDEES_SUBCOLLECTION);
                if (colRef.count) {
                    const snap = await colRef.count().get();
                    const count =
                        snap?.data?.()?.count ?? snap?.data?.count ?? 0;
                    return count;
                } else {
                    const snap = await colRef.get();
                    return snap.size ?? 0;
                }
            } catch (error) {
                console.error(
                    `Failed to count attendees for event ${eventID}`,
                    { error: error.message },
                );
                return 0;
            }
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDatabase,
                REDIS_TTL.EVENT_DEFAULT,
            );
        } catch (err) {
            console.error("[countEventAttendees] Redis error:", err);
            return fetchFromDatabase();
        }
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

        const { displayName, email, manually, attendeeStatus } =
            validation.data;

        try {
            const initialSearchableKeywords = [
                ...new Set([
                    ...(displayName
                        ? displayName.toLowerCase().split(" ")
                        : []),
                    email.toLowerCase(),
                ]),
            ];

            const now = this._nowISO();
            const status =
                manually && attendeeStatus
                    ? attendeeStatus
                    : ATTENDEE_STATUS.REGISTERED;
            const checkInTime =
                status === ATTENDEE_STATUS.CHECKED_IN ? now : null;

            const newAttendeeDoc = {
                eventID,
                displayName,
                email,
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

            const FieldValue = this._getFieldValue();
            if (FieldValue) {
                await newDocRef.update({
                    searchableKeywords: FieldValue.arrayUnion(
                        String(newAttendeeID).toLowerCase(),
                    ),
                });
            }

            console.info(
                `Invalidating cache for event ${eventID} due to new attendee.`,
            );
            await this.invalidateEventAttendeesCache(eventID);

            const finalDoc = await newDocRef.get();
            const createdAttendee = {
                attendeeID: finalDoc.id,
                ...finalDoc.data(),
            };

            console.info(
                `Successfully created attendee ${newAttendeeID} for event ${eventID}.`,
            );
            return { success: true, data: createdAttendee };
        } catch (error) {
            console.error(`Failed to create attendee for event ${eventID}`, {
                message: error.message,
            });
            return { success: false, message: "Failed to create attendee." };
        }
    }

    async updateEventAttendee(eventID, attendeeID, updateData, actor = null) {
        if (!eventID || !attendeeID)
            throw new AppError({
                statusCode: 400,
                message: "eventID and attendeeID are required",
            });

        const attendeeRef = this.eventCollection
            .doc(eventID)
            .collection(ATTENDEES_SUBCOLLECTION)
            .doc(attendeeID);

        try {
            await this.redisLockService.executeWithLock(
                `event:${eventID}:attendee:${attendeeID}`,
                async () => {
                    await this.db.runTransaction(async (tx) => {
                        const attDoc = await tx.get(attendeeRef);
                        if (!attDoc.exists)
                            throw new AppError({
                                statusCode: 404,
                                message: "Attendee not found",
                            });

                        const current = attDoc.data();

                        // Optional: validate status transitions, permissions here
                        const merged = { ...current, ...updateData };
                        const validation = AttendeeSchema.safeParse({
                            attendeeID,
                            ...merged,
                        });
                        if (!validation.success) {
                            throw new AppError({
                                statusCode: 400,
                                message: "Invalid attendee update",
                                errorCode: ERROR_CODE.INVALID_DATA,
                            });
                        }

                        tx.update(attendeeRef, {
                            ...updateData,
                            updatedAt: this._nowISO(),
                        });
                    });
                },
            );

            console.info(
                `Invalidating attendee list cache for event ${eventID} due to attendee update.`,
            );
            await this.invalidateEventAttendeesCache(eventID);

            const final = await attendeeRef.get();
            return {
                success: true,
                data: { attendeeID: final.id, ...final.data() },
            };
        } catch (err) {
            console.error(`[updateEventAttendee] error:`, err);
            throw err;
        }
    }

    async removeEventAttendee(eventID, attendeeID, actor = null) {
        if (!eventID || !attendeeID)
            throw new AppError({
                statusCode: 400,
                message: "eventID and attendeeID are required",
            });

        const attendeeRef = this.eventCollection
            .doc(eventID)
            .collection(ATTENDEES_SUBCOLLECTION)
            .doc(attendeeID);

        try {
            await this.redisLockService.executeWithLock(
                `event:${eventID}:attendee:${attendeeID}`,
                async () => {
                    await this.db.runTransaction(async (tx) => {
                        const attDoc = await tx.get(attendeeRef);
                        if (!attDoc.exists)
                            throw new AppError({
                                statusCode: 404,
                                message: "Attendee not found",
                            });
                        const attendeeData = attDoc.data();

                        // Optionally check if actor is allowed to remove attendee
                        tx.delete(attendeeRef);
                    });
                },
            );

            console.info(
                `Invalidating attendee list cache for event ${eventID} due to attendee removal.`,
            );
            await this.invalidateEventAttendeesCache(eventID);

            return { success: true };
        } catch (err) {
            console.error("[removeEventAttendee] error:", err);
            throw err;
        }
    }

    // -----------------------
    // Tickets
    // -----------------------
    async getEventTicketTypes(eventID) {
        if (!eventID) {
            console.warn("[getEventTicketTypes] eventID is required.");
            return [];
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
                if (snapshot.empty) return [];
                return snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
            } catch (err) {
                console.error(`[getEventTicketTypes] error:`, err);
                return [];
            }
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDatabase,
                REDIS_TTL.TICKET_TYPES_DEFAULT,
            );
        } catch (err) {
            console.error("[getEventTicketTypes] Redis error:", err);
            return fetchFromDatabase();
        }
    }

    // -----------------------
    // Contributors
    // -----------------------
    async getEventContributors(eventID) {
        if (!eventID) return [];
        const cacheKey = this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID);
        const fetchFromDb = async () => {
            console.info(
                `[CACHE MISS] Fetching contributors for event ${eventID} from Firestore.`,
            );
            const snap = await this.eventCollection
                .doc(eventID)
                .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
                .get();
            if (snap.empty) return [];
            return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDb,
                REDIS_TTL.EVENT_DEFAULT,
            );
        } catch (err) {
            console.error("[getEventContributors] Redis error:", err);
            return fetchFromDb();
        }
    }

    async createContributor(eventID, contributorData) {
        if (!eventID) throw new Error("Event ID là bắt buộc.");

        try {
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
        if (!eventID || !contributorID)
            throw new Error("eventID and contributorID are required");

        const contributorRef = this.eventCollection
            .doc(eventID)
            .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
            .doc(contributorID);

        try {
            await this.db.runTransaction(async (tx) => {
                const contributorDoc = await tx.get(contributorRef);
                if (!contributorDoc.exists) {
                    tx.set(contributorRef, data);
                } else {
                    tx.update(contributorRef, data);
                }
            });

            console.log(`Invalidating caches for event ${eventID}...`);
            const keysToInvalidate = [
                this.CACHE_KEYS.EVENT_BY_ID(eventID),
                this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
            ];
            await this.redisService.del(...keysToInvalidate);
            console.log(`Caches invalidated successfully.`);
        } catch (e) {
            console.error("[updateContributor] error:", e);
            throw e;
        }
    }

    async removeContributor(eventID, contributorID, userID) {
        if (!eventID || !contributorID)
            throw new Error("eventID and contributorID are required");

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

                        if (!eventDoc.exists)
                            throw new AppError({
                                message: `Event with ID ${eventID} not found.`,
                                statusCode: 404,
                                errorCode: ERROR_CODE.NOT_FOUND,
                            });

                        const eventData = eventDoc.data();
                        if (eventData.organizer?.organizerID !== userID)
                            throw new AppError({
                                message:
                                    "You do not have permission to modify this event.",
                                statusCode: 403,
                                errorCode: ERROR_CODE.FORBIDDEN,
                            });

                        if (!contributorDoc.exists)
                            throw new AppError({
                                message: `Contributor with ID ${contributorID} not found in event ${eventID}.`,
                                statusCode: 404,
                                errorCode: ERROR_CODE.NOT_FOUND,
                            });

                        transaction.delete(contributorRef);
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

    // -----------------------
    // Helpers
    // -----------------------
    async invalidateEventAttendeesCache(eventID) {
        if (!eventID) return;
        const prefix = `event:${eventID}:attendees`;
        try {
            await this.redisService.invalidateByTrackingKey(prefix);
        } catch (err) {
            console.error("[invalidateEventAttendeesCache] Redis error:", err);
        }
    }
}
