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
import { createEventSlug } from "../utils/utils.js";

export class EventService {
    constructor({
        db,
        redisService,
        // redisLockService,  // ❌ không dùng nữa
        contributorService,
        ticketClientService,
        eventLifecycleEventService,
        logger = console,
    }) {
        this.db = db;
        this.eventCollection = db.collection(EVENTS_COLLECTION || "events");
        this.redisService = redisService;
        this.contributorService = contributorService;
        this.ticketClientService = ticketClientService;
        this.eventLifecycleEventService = eventLifecycleEventService;
        this.logger = logger;

        this.CACHE_KEYS = {
            // Tracking key gốc — dùng để invalidate tất cả cache liên quan đến 1 event
            EVENT_TRACKING: (eventID) => `event:${eventID}`,

            // Detail theo ID (byID cache)
            EVENT_BY_ID: (eventID) => `event:${eventID}:byID`,

            // Detail public theo slug
            EVENT_DETAIL_SLUG: (slug) => `event:slug:${slug}:detail`,

            // Ticket types của event
            EVENT_TICKET_TYPES_BY_ID: (eventID) =>
                `event:${eventID}:ticketTypes`,

            // Attendees list theo trang/filter
            EVENT_ATTENDEES_BY_PAGE: (eventID, params) =>
                `event:${eventID}:attendees:${stableStringify(params)}`,

            EVENT_ATTENDEE_COUNT: (eventID) =>
                `event:${eventID}:attendees:count`,

            // Danh sách events theo tổ chức
            EVENTS_BY_ORG_ID: (orgID) => `events:org:${orgID}`,
        };
    }

    _fv() {
        return FieldValue;
    }
    _cacheSet({ key, value, ttl, trackingKey }) {
        return this.redisService.set(key, value, { ttl, trackingKey });
    }
    _cacheGet(key) {
        return this.redisService.get(key);
    }
    _cacheGetOrSet({ key, ttl, trackingKey, fetchFn }) {
        return this.redisService.getOrSet(key, fetchFn, ttl, { trackingKey });
    }
    _invalidateEvent(eventID) {
        const tracking = this.CACHE_KEYS.EVENT_TRACKING(eventID);
        if (this.redisService.invalidateByTrackingKey) {
            return this.redisService.invalidateByTrackingKey(tracking);
        }
        return this.redisService.del(
            this.CACHE_KEYS.EVENT_BY_ID(eventID),
            this.CACHE_KEYS.EVENT_TICKET_TYPES_BY_ID(eventID),
        );
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
            lastCursor = null, // { valueForOrderBy, id } (tuỳ orderBy)
            isDeleted = false,
        } = options;

        try {
            let query = this.eventCollection;

            if (status) query = query.where("status", "==", status);

            // ⚠ Tránh '!=' vì dễ vỡ index; nếu không có cờ isDeleted thì bỏ filter này
            if (typeof isDeleted === "boolean")
                query = query.where("isDeleted", "==", isDeleted);

            query = query.orderBy(orderBy, sortOrder);

            if (lastCursor && lastCursor.valueForOrderBy !== undefined) {
                // Cursor an toàn: truyền đúng thứ tự field theo orderBy (và id nếu cần)
                query = query.startAfter(lastCursor.valueForOrderBy);
            }

            query = query.limit(limit);

            const snapshot = await query.get();
            if (snapshot.empty) {
                return {
                    events: [],
                    hasMore: false,
                    nextCursor: null,
                    total: 0,
                };
            }

            const docs = snapshot.docs;
            const events = docs.map((doc) => {
                const data = doc.data();
                return {
                    eventID: doc.id,
                    ...data,
                };
            });

            const lastDoc = docs[docs.length - 1];
            const lastValue = lastDoc?.get(orderBy);
            const nextCursor =
                lastDoc && lastValue !== undefined
                    ? { valueForOrderBy: lastValue }
                    : null;

            return {
                events,
                hasMore: docs.length === limit,
                nextCursor,
                total: docs.length,
            };
        } catch (err) {
            this.logger.error("[getAllEvents] error:", err);
            throw err;
        }
    }

    async getEventsByOrgID(orgID) {
        if (!orgID) return [];
        const cacheKey = this.CACHE_KEYS.EVENTS_BY_ORG_ID(orgID);

        const fetchFromDb = async () => {
            this.logger.info(`[Cache Miss] Events by orgID ${orgID}`);
            const snap = await this.eventCollection
                .where("organizer.organizerID", "==", orgID)
                .get();
            if (snap.empty) return [];
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        };

        try {
            const events = await this.redisService.getOrSet(
                cacheKey,
                fetchFromDb,
                REDIS_TTL.EVENT_DEFAULT,
            );
            return events || [];
        } catch (err) {
            this.logger.error("[getEventsByOrgID] Redis error:", err);
            return fetchFromDb();
        }
    }

    async getPublicEventDetail(slug) {
        if (!slug) return null;

        const cacheKey = this.CACHE_KEYS.EVENT_DETAIL_SLUG(slug);

        const fetchFn = async () => {
            const snap = await this.eventCollection
                .where("slug", "==", slug)
                .limit(1)
                .get();

            if (snap.empty) {
                // Negative caching 15s cho slug sai
                await this._cacheSet({ key: cacheKey, value: null, ttl: 15 });
                return null;
            }

            const doc = snap.docs[0];
            const e = doc.data();

            if (e.status === EVENT_STATUS.CANCELLED) {
                throw new AppError({
                    statusCode: 410,
                    message: "Event cancelled",
                });
            }
            if (e.status !== EVENT_STATUS.PUBLISHED) {
                await this._cacheSet({ key: cacheKey, value: null, ttl: 15 }); // treat as 404 public
                return null;
            }

            const ttSnap = await doc.ref
                .collection(TICKET_TYPES_SUBCOLLECTION)
                .orderBy("price", "asc")
                .get();

            const ticketTypes = ttSnap.docs.map((d) => {
                const t = d.data();
                const sold = Number(t.soldQuantity ?? 0);
                const total = Number(t.totalQuantity ?? 0);
                const available = Math.max(total - sold, 0);
                return {
                    ticketTypeID: t.ticketTypeID,
                    name: t.name,
                    price: t.price,
                    currency: t.currency,
                    totalQuantity: total,
                    soldQuantity: sold,
                    availableQuantity: available,
                    isSoldOut: available === 0,
                };
            });

            const result = sanitizePublicEvent({
                ...e,
                ticketTypes,
                isAllSoldOut:
                    ticketTypes.length > 0 &&
                    ticketTypes.every((x) => x.isSoldOut),
            });

            // Gắn trackingKey theo eventID
            await this._cacheSet({
                key: cacheKey,
                value: result,
                ttl: 60,
                trackingKey: this.CACHE_KEYS.EVENT_TRACKING(e.eventID),
            });

            return result;
        };

        try {
            return await this._cacheGetOrSet({
                key: cacheKey,
                ttl: 60,
                fetchFn,
            });
        } catch (err) {
            this.logger.error(`[getPublicEventDetail] error for slug=${slug}`, {
                err: err.message,
            });
            return fetchFn(); // vẫn throw 410 khi cần
        }
    }

    async getEventByID(eventID, isPublic = true) {
        if (!eventID) return null;
        const cacheKey = this.CACHE_KEYS.EVENT_BY_ID(eventID);

        const fetchFromDB = async () => {
            const docRef = this.eventCollection.doc(eventID);
            const [evSnap, cSnap] = await Promise.all([
                docRef.get(),
                docRef.collection(EVENT_CONTRIBUTORS_SUBCOLLECTION).get(),
            ]);
            if (!evSnap.exists) return null;
            const eventData = evSnap.data();
            const contributors = cSnap.empty
                ? []
                : cSnap.docs.map((d) => ({ contributorID: d.id, ...d.data() }));
            const raw = { ...eventData, eventContributors: contributors };

            await this._cacheSet({
                key: cacheKey,
                value: raw,
                ttl: REDIS_TTL.EVENT_DEFAULT,
                trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID),
            });

            return raw;
        };

        try {
            const raw = await this._cacheGetOrSet({
                key: cacheKey,
                ttl: REDIS_TTL.EVENT_DEFAULT,
                fetchFn: fetchFromDB,
            });
            if (!raw) return null;
            return isPublic ? sanitizePublicEvent(raw) : raw;
        } catch (err) {
            this.logger.error("[getEventByID] Redis error:", err);
            const raw = await fetchFromDB();
            return isPublic ? sanitizePublicEvent(raw) : raw;
        }
    }

    async createEvent(user, eventData) {
        if (!user?.uid)
            throw new AppError({ statusCode: 401, message: "Unauthorized" });

        const { ticketTypes = [], eventContributors = [], ...rest } = eventData;
        const eventRef = this.eventCollection.doc();
        const eventID = eventRef.id;

        // Resolve contributors OUTSIDE transaction
        let resolvedContributors = [];
        if (Array.isArray(eventContributors) && eventContributors.length) {
            try {
                resolvedContributors = await Promise.all(
                    eventContributors.map((c) =>
                        this.contributorService
                            .findOrCreate(c)
                            .then((res) => ({ ...res, originalData: c })),
                    ),
                );
            } catch (err) {
                this.logger.error("[createEvent] resolve contributors:", err);
                throw new AppError({
                    statusCode: 400,
                    message: "Failed to resolve contributors",
                });
            }
        }

        const slug = createEventSlug(eventData.title);
        // TODO: ensure unique slug if cần (check collisions)

        const newEvent = {
            ...rest,
            eventID,
            slug,
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
                // ❌ không gán totalTickets = số loại vé (dễ hiểu sai)
            },
            startTime: eventData.startTime
                ? new Date(eventData.startTime).toISOString()
                : null,
            endTime: eventData.endTime
                ? new Date(eventData.endTime).toISOString()
                : null,
            createdAt: null, // set bằng serverTimestamp
            updatedAt: null,
        };

        await this.db.runTransaction(async (tx) => {
            tx.set(eventRef, {
                ...newEvent,
                createdAt: this._fv().serverTimestamp(),
                updatedAt: this._fv().serverTimestamp(),
            });

            if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
                const tcol = eventRef.collection(TICKET_TYPES_SUBCOLLECTION);
                for (const tt of ticketTypes) {
                    const tdRef = tcol.doc();
                    const newTicketType = { ...tt, ticketTypeID: tdRef.id };
                    tx.set(tdRef, newTicketType);
                }
            }

            if (resolvedContributors.length > 0) {
                const ccol = eventRef.collection(
                    EVENT_CONTRIBUTORS_SUBCOLLECTION,
                );
                for (const {
                    id: contributorID,
                    data: contributorData,
                    originalData,
                } of resolvedContributors) {
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
                    tx.set(ccol.doc(contributorID), linkData);
                }
            }
        });

        // Invalidate org list cache
        await this.redisService.del(this.CACHE_KEYS.EVENTS_BY_ORG_ID(user.uid));

        return eventID;
    }

    async updateEvent(eventID, eventData, actor = null) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const eventRef = this.eventCollection.doc(eventID);
        let updatedEvent = null;

        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(eventRef);
            if (!snap.exists)
                throw new AppError({
                    statusCode: 404,
                    message: "Event not found",
                });

            const existingEvent = snap.data();

            if (
                actor?.userID &&
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
                Array.isArray(eventData.ticketTypes) &&
                eventData.ticketTypes.length > 0
            ) {
                eventData.ticketTypes = await this._validateTicketTypes(
                    existingEvent.ticketTypes ?? [],
                    eventData.ticketTypes,
                );
            }

            const updateData = this._prepareUpdateData(eventData);
            tx.update(eventRef, {
                ...updateData,
                updatedAt: this._fv().serverTimestamp(),
            });

            updatedEvent = { ...existingEvent, ...updateData };
        });

        await this._invalidateEvent(eventID);

        await this.redisService.del(
            this.CACHE_KEYS.EVENTS_BY_ORG_ID(
                (updatedEvent || eventData || cancelledEvent)?.organizer
                    ?.organizerID ?? "unknown",
            ),
        );

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

        // 1) Kiểm tra có ticket types
        const eventTicketTypes =
            await this.ticketClientService.getEventTicketTypes(eventID);
        if (!Array.isArray(eventTicketTypes) || eventTicketTypes.length === 0) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
                message:
                    "An event must have at least one ticket type before it can be published.",
            });
        }

        const eventRef = this.eventCollection.doc(eventID);
        let eventData = null;

        // 2) Ghi trạng thái
        await this.db.runTransaction(async (tx) => {
            const eventDoc = await tx.get(eventRef);
            if (!eventDoc.exists)
                throw new AppError({
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                    message: "Event Not Found.",
                });

            const event = eventDoc.data();
            if (event.organizer?.organizerID !== organizerID)
                throw new AppError({
                    statusCode: 401,
                    errorCode: ERROR_CODE.UNAUTHORIZED,
                    message: "Unauthorized",
                });
            if (event.status === EVENT_STATUS.PUBLISHED)
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_OPERATION,
                    message: "Already published.",
                });
            if (event.startTime && new Date(event.startTime) < new Date())
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "Event already passed.",
                });

            tx.update(eventRef, {
                status: EVENT_STATUS.PUBLISHED,
                publishedAt: this._fv().serverTimestamp(),
                updatedAt: this._fv().serverTimestamp(),
            });

            eventData = event; // lưu để dùng sau transaction
        });

        // 3) Invalidate cache theo trackingKey
        await this._invalidateEvent(eventID);
        await this.redisService.del(
            this.CACHE_KEYS.EVENTS_BY_ORG_ID(
                eventData?.organizer?.organizerID ?? "unknown",
            ),
        );

        // 4) Khởi tạo tồn kho (IMPORTANT)
        const tt = await this.ticketClientService.getEventTicketTypes(eventID);

        await Promise.all(
            tt.map((t) =>
                this.redisService.setRaw(
                    `inv:${t.ticketTypeID}:remaining`,
                    String(t.totalQuantity),
                    { ttl: 0 },
                ),
            ),
        );

        // 5) Emit lifecycle event
        await this.eventLifecycleEventService.sendEventPublished({
            eventID,
            organizerID,
            ...eventData,
        });

        return { success: true };
    }

    async cancelEvent(eventID, actor, cancelReason = "No reason provided") {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });
        if (!actor?.userID)
            throw new AppError({
                statusCode: 401,
                message: "actor is required",
            });

        const { userID, username, email } = actor;
        const eventRef = this.eventCollection.doc(eventID);
        let cancelledEvent = null;

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
                    errorCode: ERROR_CODE.FORBIDDEN,
                    message: "Forbidden",
                });

            if (event.status === EVENT_STATUS.CANCELLED) {
                cancelledEvent = event;
                return;
            }

            const startTime = event.startTime
                ? new Date(event.startTime).getTime()
                : 0;
            if (startTime <= Date.now())
                throw new AppError({
                    statusCode: 400,
                    message: "Event already started; cannot cancel.",
                });

            const updateData = {
                status: EVENT_STATUS.CANCELLED,
                cancelReason,
                cancelledBy: userID,
                cancelledByUsername: username ?? "unknown",
                cancelledByEmail: email ?? null,
                cancelledAt: this._fv().serverTimestamp(),
                updatedAt: this._fv().serverTimestamp(),
            };

            tx.update(eventRef, updateData);
            cancelledEvent = { ...event, ...updateData };
        });

        await this._invalidateEvent(eventID);
        await this.redisService.del(
            this.CACHE_KEYS.EVENTS_BY_ORG_ID(
                (updatedEvent || eventData || cancelledEvent)?.organizer
                    ?.organizerID ?? "unknown",
            ),
        );

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
                    "Cannot downgrade published event with participants to draft",
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
                    message: "Cannot update times after event has started",
                });
            }
        }

        if (eventData.startTime && eventData.endTime) {
            const s = new Date(eventData.startTime);
            const e = new Date(eventData.endTime);
            if (e <= s) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "End time must be after start time",
                });
            }
        }

        if (eventData.startTime && !eventData.endTime && existingEnd) {
            const s = new Date(eventData.startTime);
            if (s >= existingEnd) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "New start time must be before existing end time",
                });
            }
        }

        if (eventData.endTime && !eventData.startTime && existingStart) {
            const e = new Date(eventData.endTime);
            if (e <= existingStart) {
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
        for (const t of current) {
            if (t?.ticketTypeID) ticketMap.set(t.ticketTypeID, { ...t });
        }

        let changed = false;
        for (const upd of updates) {
            const { ticketTypeID } = upd;
            if (!ticketTypeID) {
                changed = true;
                ticketMap.set(
                    `__new_${Math.random().toString(36).slice(2, 9)}`,
                    { ...upd },
                );
                continue;
            }
            const exist = ticketMap.get(ticketTypeID);
            if (!exist) {
                changed = true;
                ticketMap.set(ticketTypeID, upd);
                continue;
            }
            const merged = { ...exist, ...upd };
            if (diff(exist, merged).length > 0) {
                changed = true;
                ticketMap.set(ticketTypeID, merged);
            }
        }

        const mergedArray = Array.from(ticketMap.values());
        return !changed && mergedArray.length === current.length
            ? current
            : mergedArray;
    }

    _prepareUpdateData(eventData) {
        const updateData = { ...eventData };
        if (updateData.startTime)
            updateData.startTime = new Date(updateData.startTime).toISOString();
        if (updateData.endTime)
            updateData.endTime = new Date(updateData.endTime).toISOString();
        // updatedAt set trong transaction = serverTimestamp
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
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const {
            limit = 10,
            startAfter, // serialize-safe cursor: { fieldValue, id? }
            sortBy = "checkInTime",
            sortOrder = "asc",
            search,
        } = params;

        const allowedOrderBy = [
            "checkInTime",
            "displayName",
            "email",
            "joinedAt",
        ];
        const finalSortBy = allowedOrderBy.includes(sortBy)
            ? sortBy
            : "checkInTime";
        const finalSortOrder = ["asc", "desc"].includes(sortOrder)
            ? sortOrder
            : "asc";

        const cacheParams = {
            limit,
            sortBy: finalSortBy,
            sortOrder: finalSortOrder,
            search: search?.toString().toLowerCase() ?? null,
            startAfter: startAfter?.fieldValue ?? null,
        };
        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEES_BY_PAGE(
            eventID,
            cacheParams,
        );

        const fetchFromDatabase = async () => {
            this.logger.info(`[CACHE MISS] Attendees ${eventID}`);
            let q = this.eventCollection
                .doc(eventID)
                .collection(ATTENDEES_SUBCOLLECTION);

            if (search && typeof search === "string" && search.length > 2) {
                const normalized = search.toLowerCase().split(" ")[0];
                q = q.where("searchableKeywords", "array-contains", normalized);
            }

            q = q.orderBy(finalSortBy, finalSortOrder).limit(limit + 1);

            if (startAfter?.fieldValue !== undefined) {
                q = q.startAfter(startAfter.fieldValue);
            }

            const snapshot = await q.get();
            if (snapshot.empty) {
                return {
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
                    const raw = { attendeeID: doc.id, ...doc.data() };
                    const v = AttendeeSchema.safeParse(raw);
                    if (!v.success) {
                        this.logger.warn(
                            `Invalid attendee doc: ${doc.id}`,
                            v.error.flatten(),
                        );
                        return null;
                    }
                    return v.data;
                })
                .filter(Boolean);

            const nextCursor =
                lastVisible?.get(finalSortBy) !== undefined
                    ? { fieldValue: lastVisible.get(finalSortBy) }
                    : null;

            return {
                data: attendees,
                metadata: { limit, hasMore, nextCursor },
            };
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDatabase,
                REDIS_TTL.EVENT_DEFAULT,
            );
        } catch (err) {
            this.logger.error("[getEventAttendees] Redis error:", err);
            return fetchFromDatabase();
        }
    }

    async countEventAttendees(eventID) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const cacheKey = this.CACHE_KEYS.EVENT_ATTENDEE_COUNT(eventID);

        const fetchFromDatabase = async () => {
            this.logger.info(`[CACHE MISS] Count attendees ${eventID}`);
            try {
                const colRef = this.eventCollection
                    .doc(eventID)
                    .collection(ATTENDEES_SUBCOLLECTION);
                if (typeof colRef.count === "function") {
                    const snap = await colRef.count().get();
                    return snap.data().count ?? 0;
                }
                const snap = await colRef.get();
                return snap.size ?? 0;
            } catch (e) {
                this.logger.error(`[countEventAttendees] error:`, e);
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
            this.logger.error("[countEventAttendees] Redis error:", err);
            return fetchFromDatabase();
        }
    }

    async createEventAttendee(eventID, inputData) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const v = AttendeeSchema.safeParse(inputData);
        if (!v.success) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
                message: "Invalid attendee data",
                errors: v.error.flatten(),
            });
        }

        const { displayName, email, manually, attendeeStatus } = v.data;

        const initialSearchableKeywords = [
            ...new Set([
                ...(displayName ? displayName.toLowerCase().split(" ") : []),
                email.toLowerCase(),
            ]),
        ];

        const status =
            manually && attendeeStatus
                ? attendeeStatus
                : ATTENDEE_STATUS.REGISTERED;

        const newAttendeeDoc = {
            eventID,
            displayName,
            email: email.toLowerCase(),
            attendeeStatus: status,
            checkInTime:
                status === ATTENDEE_STATUS.CHECKED_IN
                    ? this._fv().serverTimestamp()
                    : null,
            searchableKeywords: initialSearchableKeywords,
            joinedAt: this._fv().serverTimestamp(),
            updatedAt: this._fv().serverTimestamp(),
        };

        const docRef = await this.eventCollection
            .doc(eventID)
            .collection(ATTENDEES_SUBCOLLECTION)
            .add(newAttendeeDoc);

        await docRef.update({
            searchableKeywords: this._fv().arrayUnion(
                String(docRef.id).toLowerCase(),
            ),
        });

        await this.invalidateEventAttendeesCache(eventID);

        const finalDoc = await docRef.get();
        return { attendeeID: finalDoc.id, ...finalDoc.data() };
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

        await this.db.runTransaction(async (tx) => {
            const attDoc = await tx.get(attendeeRef);
            if (!attDoc.exists)
                throw new AppError({
                    statusCode: 404,
                    message: "Attendee not found",
                });

            const current = attDoc.data();
            const merged = { ...current, ...updateData };
            const v = AttendeeSchema.safeParse({ attendeeID, ...merged });
            if (!v.success) {
                throw new AppError({
                    statusCode: 400,
                    message: "Invalid attendee update",
                    errorCode: ERROR_CODE.INVALID_DATA,
                });
            }

            tx.update(attendeeRef, {
                ...updateData,
                updatedAt: this._fv().serverTimestamp(),
            });
        });

        await this.invalidateEventAttendeesCache(eventID);

        const final = await attendeeRef.get();
        return { attendeeID: final.id, ...final.data() };
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

        await this.db.runTransaction(async (tx) => {
            const attDoc = await tx.get(attendeeRef);
            if (!attDoc.exists)
                throw new AppError({
                    statusCode: 404,
                    message: "Attendee not found",
                });

            tx.delete(attendeeRef);
        });

        await this.invalidateEventAttendeesCache(eventID);
        return { success: true };
    }

    // -----------------------
    // Tickets
    // -----------------------
    async getEventTicketTypes(eventID) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const cacheKey = this.CACHE_KEYS.EVENT_TICKET_TYPES_BY_ID(eventID);

        const fetchFromDatabase = async () => {
            this.logger.info(`[CACHE MISS] Ticket types ${eventID}`);
            const snap = await this.eventCollection
                .doc(eventID)
                .collection(TICKET_TYPES_SUBCOLLECTION)
                .get();
            if (snap.empty) return [];
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDatabase,
                REDIS_TTL.TICKET_TYPES_DEFAULT,
            );
        } catch (err) {
            this.logger.error("[getEventTicketTypes] Redis error:", err);
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
            this.logger.info(`[CACHE MISS] Contributors ${eventID}`);
            const snap = await this.eventCollection
                .doc(eventID)
                .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
                .get();
            if (snap.empty) return [];
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        };

        try {
            return await this.redisService.getOrSet(
                cacheKey,
                fetchFromDb,
                REDIS_TTL.EVENT_DEFAULT,
            );
        } catch (err) {
            this.logger.error("[getEventContributors] Redis error:", err);
            return fetchFromDb();
        }
    }

    async createContributor(eventID, contributorData) {
        if (!eventID)
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });

        const ccol = this.eventCollection
            .doc(eventID)
            .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION);
        const ref = ccol.doc();
        const contributorID = ref.id;

        await ref.set({ ...contributorData, contributorID });

        await this.redisService.del(
            this.CACHE_KEYS.EVENT_BY_ID(eventID),
            this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
        );

        return { ...contributorData, contributorID };
    }

    async updateContributor(eventID, contributorID, data, actor = null) {
        if (!eventID || !contributorID)
            throw new AppError({
                statusCode: 400,
                message: "eventID and contributorID are required",
            });

        const contributorRef = this.eventCollection
            .doc(eventID)
            .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
            .doc(contributorID);

        await this.db.runTransaction(async (tx) => {
            const doc = await tx.get(contributorRef);
            if (!doc.exists) tx.set(contributorRef, data);
            else tx.update(contributorRef, data);
        });

        await this.redisService.del(
            this.CACHE_KEYS.EVENT_BY_ID(eventID),
            this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
        );

        return { success: true };
    }

    async removeContributor(eventID, contributorID, userID) {
        if (!eventID || !contributorID)
            throw new AppError({
                statusCode: 400,
                message: "eventID and contributorID are required",
            });

        const eventRef = this.eventCollection.doc(eventID);
        const contributorRef = eventRef
            .collection(EVENT_CONTRIBUTORS_SUBCOLLECTION)
            .doc(contributorID);

        await this.db.runTransaction(async (tx) => {
            const eventDoc = await tx.get(eventRef);
            const cDoc = await tx.get(contributorRef);

            if (!eventDoc.exists)
                throw new AppError({
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                    message: "Event not found",
                });

            const eventData = eventDoc.data();
            if (eventData.organizer?.organizerID !== userID)
                throw new AppError({
                    statusCode: 403,
                    errorCode: ERROR_CODE.FORBIDDEN,
                    message: "Forbidden",
                });

            if (!cDoc.exists)
                throw new AppError({
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                    message: "Contributor not found",
                });

            tx.delete(contributorRef);
        });

        await this.redisService.del(
            this.CACHE_KEYS.EVENT_BY_ID(eventID),
            this.CACHE_KEYS.EVENT_CONTRIBUTORS_BY_ID(eventID),
        );

        return { success: true };
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
            this.logger.error(
                "[invalidateEventAttendeesCache] Redis error:",
                err,
            );
        }
    }
}
