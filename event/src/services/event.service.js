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
import { createEventSlug, reserveUniqueSlugTx } from "../utils/utils.js";

export class EventService {
    constructor({
        db,
        config,
        redisService,
        contributorService,
        ticketClientService,
        redisPubSub,
        eventLifecycleEventService,
        logger = console,
    }) {
        this.config = config;
        this.db = db;
        this.eventCollection = db.collection(EVENTS_COLLECTION || "events");
        this.redisService = redisService;
        this.redisPubSub = redisPubSub;
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

            EVENT_CONTRIBUTORS_BY_ID: (eventID) =>
                `event:${eventID}:contributors`,
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

    async _invalidateEvent(eventID, { organizerID, slug } = {}) {
        const tracking = this.CACHE_KEYS.EVENT_TRACKING(eventID);
        if (this.redisService.invalidateByTrackingKey) {
            await this.redisService.invalidateByTrackingKey(tracking);
        }

        if (slug) {
            await this.redisService.del(
                this.CACHE_KEYS.EVENT_DETAIL_SLUG(slug),
            );
        }

        if (organizerID) {
            await this.redisService.del(
                this.CACHE_KEYS.EVENTS_BY_ORG_ID(organizerID),
            );
        }

        await this.redisService.del(
            this.CACHE_KEYS.EVENT_BY_ID(eventID),
            this.CACHE_KEYS.EVENT_TICKET_TYPES_BY_ID(eventID),
        );

        if (slug) {
            console.log(
                `SLUG: ${slug} - ${this.config.service_urls.frontend}/api/internal/revalidate-event`,
            );
            fetch(
                `${this.config.service_urls.frontend}/api/internal/revalidate-event`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        slug,
                        secret: this.config.service_keys.revalidate_key,
                    }),
                },
            ).catch((err) => {
                this.logger.warn("[Revalidate] Failed", { err: err.message });
            });
        }
    }

    // -----------------------
    // Events: CRUD + publish/cancel
    // -----------------------
    async getAllEvents(options = {}) {
        const {
            limit = 20,
            orderBy = "createdAt",
            sortOrder = "desc",
            status,
            lastCursor = null, // { valueForOrderBy, id }
            isDeleted,
        } = options;

        try {
            let query = this.eventCollection;

            if (status !== undefined && status !== null && status !== "") {
                query = query.where("status", "==", status);
            }

            if (Object.prototype.hasOwnProperty.call(options, "isDeleted")) {
                if (typeof isDeleted !== "boolean") {
                    throw new Error("isDeleted must be boolean when provided");
                }
                query = query.where("isDeleted", "==", isDeleted);
            }

            query = query.orderBy(orderBy, sortOrder).orderBy("__name__");

            if (lastCursor?.valueForOrderBy !== undefined && lastCursor?.id) {
                query = query.startAfter(
                    lastCursor.valueForOrderBy,
                    lastCursor.id,
                );
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
            const events = docs.map((doc) => ({
                eventID: doc.id,
                ...doc.data(),
            }));

            const lastDoc = docs[docs.length - 1];
            const lastValue = lastDoc?.get(orderBy);
            const nextCursor =
                lastDoc && lastValue !== undefined
                    ? { valueForOrderBy: lastValue, id: lastDoc.id }
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

        const norm = String(slug).trim();
        const cacheKey = this.CACHE_KEYS.EVENT_DETAIL_SLUG(norm);

        const fetchFn = async () => {
            const slugSnap = await this.db.collection("slugs").doc(norm).get();
            if (!slugSnap.exists) {
                await this._cacheSet({ key: cacheKey, value: null, ttl: 15 });
                return null;
            }

            const { eventID } = slugSnap.data();

            const doc = await this.eventCollection.doc(eventID).get();
            if (!doc.exists) {
                await this.db
                    .collection("slugs")
                    .doc(norm)
                    .delete()
                    .catch(() => {});
                await this._cacheSet({ key: cacheKey, value: null, ttl: 15 });
                return null;
            }

            const e = doc.data();

            if (e.status === EVENT_STATUS.CANCELLED) {
                const result = sanitizePublicEvent({
                    ...e,
                    ticketTypes: [],
                    isAllSoldOut: true,
                });
                result.__httpStatus = 410;
                await this._cacheSet({
                    key: cacheKey,
                    value: result,
                    ttl: 600,
                    trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID),
                });
                return result;
            }

            if (e.status !== EVENT_STATUS.PUBLISHED) {
                await this._cacheSet({
                    key: cacheKey,
                    value: null,
                    ttl: 15,
                    trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID),
                });
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
                    price: Number(t.price ?? 0),
                    currency: t.currency ?? "VND",
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

            // set cache **một lần duy nhất** kèm trackingKey
            await this._cacheSet({
                key: cacheKey,
                value: result,
                ttl: 60,
                trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID),
            });

            return result;
        };

        const cached = await this._cacheGet(cacheKey);
        if (cached !== null) return cached;

        try {
            return await fetchFn();
        } catch (err) {
            this.logger.error(`[getPublicEventDetail] error for slug=${norm}`, {
                err: err?.message,
            });
            return fetchFn();
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

        const baseSlug = createEventSlug(eventData.title ?? "su-kien");

        await this.db.runTransaction(async (tx) => {
            const slug = await reserveUniqueSlugTx(
                this.db,
                tx,
                baseSlug,
                eventID,
            );

            tx.set(eventRef, {
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
                },
                startTime: eventData.startTime
                    ? new Date(eventData.startTime).toISOString()
                    : null,
                endTime: eventData.endTime
                    ? new Date(eventData.endTime).toISOString()
                    : null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
                const tcol = eventRef.collection(TICKET_TYPES_SUBCOLLECTION);
                for (const tt of ticketTypes) {
                    const tdRef = tcol.doc();
                    const newTicketType = {
                        ...tt,
                        ticketTypeID: tdRef.id,
                        totalQuantity: Math.max(
                            0,
                            Number(tt.totalQuantity ?? 0),
                        ),
                        soldQuantity: Math.max(0, Number(tt.soldQuantity ?? 0)),
                        price: Number(tt.price ?? 0),
                        currency: tt.currency ?? "VND",
                    };
                    tx.set(tdRef, newTicketType);
                }
            }

            if (resolvedContributors.length > 0) {
                const ccol = eventRef.collection(
                    EVENT_CONTRIBUTORS_SUBCOLLECTION,
                );

                const map = new Map();
                for (const x of resolvedContributors) map.set(x.id, x);

                for (const {
                    id: contributorID,
                    data: contributorData,
                    originalData,
                } of map.values()) {
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
                        isHeadliner: !!originalData?.isHeadliner,
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
                updatedAt: new Date().toISOString(),
            });

            updatedEvent = { ...existingEvent, ...updateData };
        });

        await this._invalidateEvent(eventID, {
            organizerID: actor?.userID,
            slug: updatedEvent?.slug,
        });

        return updatedEvent;
    }

    async publishEvent(eventID, organizerID) {
        if (!eventID) {
            throw new AppError({
                statusCode: 400,
                message: "eventID is required",
            });
        }
        if (!organizerID) {
            throw new AppError({
                statusCode: 400,
                message: "organizerID is required",
            });
        }

        // 1) Kiểm tra ticket types (shape mới: {status, data})
        const ttResp =
            await this.ticketClientService.getEventTicketTypes(eventID);
        const ticketTypes = Array.isArray(ttResp?.data) ? ttResp.data : [];
        if (ttResp?.status !== 200 || ticketTypes.length === 0) {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_DATA,
                message:
                    "An event must have at least one ticket type before it can be published.",
            });
        }

        const eventRef = this.eventCollection.doc(eventID);
        let eventData = null;

        // 2) Transaction: chuyển trạng thái → PUBLISHED
        await this.db.runTransaction(async (tx) => {
            const eventDoc = await tx.get(eventRef);
            if (!eventDoc.exists) {
                throw new AppError({
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                    message: "Event Not Found.",
                });
            }
            const event = eventDoc.data();

            if (event.organizer?.organizerID !== organizerID) {
                throw new AppError({
                    statusCode: 401,
                    errorCode: ERROR_CODE.UNAUTHORIZED,
                    message: "Unauthorized",
                });
            }
            if (event.status === EVENT_STATUS.PUBLISHED) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_OPERATION,
                    message: "Already published.",
                });
            }
            if (event.startTime && new Date(event.startTime) < new Date()) {
                throw new AppError({
                    statusCode: 400,
                    errorCode: ERROR_CODE.INVALID_DATA,
                    message: "Event already passed.",
                });
            }

            tx.update(eventRef, {
                status: EVENT_STATUS.PUBLISHED,
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            eventData = event; // dùng sau transaction
        });

        const slug = eventData?.slug;

        try {
            await this.inventoryService.seedManySharded(ticketTypes);

            await this.redisService.setRaw(
                `event:${eventID}:inv:version`,
                "0",
                { ttl: 0, nx: true }, // 👈 nếu wrapper hỗ trợ NX, tránh đè
            );
        } catch (e) {
            if (e?.code === "INVENTORY_SEED_MISMATCH") {
                this.logger.warn(
                    "[publishEvent] seed mismatch → abort publish",
                    { eventID, err: e.message },
                );
                // propagate để chặn publish (đúng với chính sách: thay đổi capacity sau publish phải migrate)
                throw e;
            }
            this.logger.warn(
                "[publishEvent] seed inventory failed (non-fatal?)",
                { eventID, err: e?.message },
            );
            // tuỳ policy: bạn có thể throw để fail sớm, hoặc cho phép tiếp tục nếu chỉ 1 số ticketTypes bị EXISTS
            throw e;
        }

        // 4) Invalidate cache theo event trackingKey (để lần đọc sau ra snapshot mới)
        try {
            await this._invalidateEvent(eventID, {
                organizerID: eventData?.organizer?.organizerID,
                slug,
            });
        } catch (e) {
            this.logger.warn("[publishEvent] invalidate cache failed", {
                eventID,
                err: e?.message,
            });
        }

        // 5) (SSE) Phát tín hiệu cho broadcaster đẩy snapshot ngay (nếu bật SSE)
        try {
            if (this.redisPubSub && (slug || true)) {
                await this.redisPubSub.publish(
                    `availability:${eventID}`,
                    JSON.stringify({
                        eventId: eventID,
                        slug,
                        reason: "publishEventInit",
                        ts: Date.now(),
                    }),
                );
            }
        } catch (e) {
            this.logger.warn("[publishEvent] pubsub notify failed", {
                eventID,
                err: e?.message,
            });
        }

        // 6) Emit lifecycle event (không đổi)
        await this.eventLifecycleEventService.sendEventPublished({
            eventID,
            organizerID,
            ...eventData,
        });

        return { success: true };
    }

    async cancelEvent(eventID, actor, cancelledReason = "No reason provided") {
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
                cancelledReason,
                cancelledBy: userID,
                cancelledByUsername: username ?? "unknown",
                cancelledByEmail: email ?? null,
                cancelledAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            tx.update(eventRef, updateData);
            cancelledEvent = { ...event, ...updateData };
        });

        await this._invalidateEvent(eventID, {
            organizerID: cancelledEvent?.organizer?.organizerID,
            slug: cancelledEvent?.slug,
        });

        const attendeesCount = await this.countEventAttendees(eventID);
        if (attendeesCount > 0) {
            await this.eventLifecycleEventService.sendEventCancelled({
                cancelledReason,
                cancelledBy: userID,
                cancelledByUsername: username,
                cancelledByEmail: email,
                eventID,
            });
        }

        return cancelledEvent;
    }

    async getPublishedEventIds() {
        const snapshot = await this.eventCollection
            .where("status", "==", "published")
            .select()
            .get();

        return snapshot.docs.map((doc) => doc.id);
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
                { trackingKey: `event:${eventID}:attendees` },
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
                { trackingKey: `event:${eventID}:attendees` },
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
                    ? new Date().toISOString()
                    : null,
            searchableKeywords: initialSearchableKeywords,
            joinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
                updatedAt: new Date().toISOString(),
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
                { trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID) },
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
                { trackingKey: this.CACHE_KEYS.EVENT_TRACKING(eventID) },
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
