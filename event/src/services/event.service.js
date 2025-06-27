import diff from "microdiff";
import { AppError, db, FieldValue } from "@event_ticket_booking_system/shared";
import { sanitizePublicEvent } from "../utils/sanitize";

export default class EventService {
    constructor({ logger, ticketServiceClient }) {
        this.logger = logger;
        this.ticketServiceClient = ticketServiceClient;
        this.eventCollection = db.collection("events");
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

    async getEventsByOrgID(orgID, isPublic = true) {
        const query = this.eventCollection.where("organizerID", "==", orgID);
        const snap = await query.get();

        if (snap.empty) {
            return [];
        }

        const events = snap.docs;
        return isPublic ? events.map((e) => sanitizePublicEvent(e)) : events;
    }

    async getEventByID(eventID, isPublic = true) {
        const docRef = this.eventCollection.doc(eventID);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        return isPublic ? sanitizePublicEvent(doc) : doc;
    }

    async createEvent(eventData) {
        const {
            organizerID,
            organizerName,
            eventTitle,
            eventDesc,
            thumbnails,
            category,
            participantCount,
            location,
            startTime,
            endTime,
            status = EVENT_STATUS.DRAFT,
        } = eventData;

        const eventDocRef = this.eventCollection.doc();

        const eventID = eventDocRef.id;
        const eventTitleLowerCase = eventTitle.toLowerCase();
        const timestampNow = FieldValue.serverTimestamp();
        const newEvent = {
            eventID,
            organizerID,
            organizerName,
            eventTitle,
            eventTitleLowerCase,
            eventDesc,
            thumbnails,
            category,
            participantCount,
            location,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            status,
            createdAt: timestampNow,
            updatedAt: timestampNow,
        };

        await eventDocRef.set(newEvent);

        return eventID;
    }

    async updateEvent(eventID, eventData) {
        const existingEvent = await this.getEventByID(eventID);
        this._validateEventUpdateRules(existingEvent, eventData);
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
            eventData.ticketTypes = await this._validateTicketTypes(
                existingEvent.ticketTypes,
                eventData.ticketTypes,
            );
        }

        const updateData = this._prepareUpdateData(eventData);

        // 6. Update the event
        await this.eventCollection
            .doc(existingEvent.eventID)
            .update(updateData);

        return updateData;
    }

    _validateEventUpdateRules(existingEvent, eventData) {
        // Cannot update cancelled events
        if (existingEvent.status === "cancelled") {
            throw new AppError({
                statusCode: 400,
                errorCode: ERROR_CODE.INVALID_OPERATION,
                message: "Cannot update cancelled events",
            });
        }

        // Cannot change status from published to draft if there are participants
        if (
            existingEvent.status === "published" &&
            eventData.status === "draft" &&
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
        updateData.updatedAt = FieldValue.serverTimestamp();

        // Remove undefined/null values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
            }
        });

        return updateData;
    }
}
