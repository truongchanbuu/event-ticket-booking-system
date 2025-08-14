import {
    AppError,
    catchAsync,
    ERROR_CODE,
} from "@event_ticket_booking_system/shared";
import { sanitizePublicEvent } from "../utils/sanitize.js";
import { EVENT_STATUS } from "../enums/event-status.js";

export class EventController {
    constructor({ logger, eventService }) {
        this.logger = logger;
        this.eventService = eventService;

        this.getMyEvents = catchAsync(this.getMyEvents.bind(this));
        this.getMyEventByID = catchAsync(this.getMyEventByID.bind(this));
        this.createEvent = catchAsync(this.createEvent.bind(this));
        this.updateMyEvent = catchAsync(this.updateMyEvent.bind(this));
        this.publishEvent = catchAsync(this.publishEvent.bind(this));
        this.cancelMyEvent = catchAsync(this.cancelMyEvent.bind(this));
        this.getPublicEventDetail = catchAsync(
            this.getPublicEventDetail.bind(this),
        );

        this.getPublicEvents = catchAsync(this.getPublicEvents.bind(this));
        this.getEventAttendees = catchAsync(this.getEventAttendees.bind(this));
        this.getEventTicketTypes = catchAsync(
            this.getEventTicketTypes.bind(this),
        );
        this.getEventContributors = catchAsync(
            this.getEventContributors.bind(this),
        );
        this.removeContributor = catchAsync(this.removeContributor.bind(this));
        this.createContributor = catchAsync(this.createContributor.bind(this));
        this.updateContributor = catchAsync(this.updateContributor.bind(this));
    }

    async getPublicEvents(req, res) {
        const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
        const orderBy = String(req.query.orderBy ?? "createdAt");
        const sortOrder =
            String(req.query.sortOrder ?? "desc").toLowerCase() === "asc"
                ? "asc"
                : "desc";

        const lastCursor = decodeCursor(String(req.query.cursor ?? ""));

        const { events, hasMore, nextCursor, total } =
            await this.eventService.getAllEvents({
                limit,
                orderBy,
                sortOrder,
                status: EVENT_STATUS.PUBLISHED,
                isDeleted: false,
                lastCursor,
            });

        console.log(`EVENTS: ${events}`);

        const sanitized = events.map((e) => sanitizePublicEvent(e));

        console.log(`SANITIZED: ${sanitized}`);

        res.setHeader(
            "Cache-Control",
            "public, s-maxage=15, stale-while-revalidate=60",
        );

        return res.status(200).json({
            ok: true,
            data: {
                events: sanitized,
                hasMore,
                nextCursor: encodeCursor(nextCursor), // FE sẽ gửi lại ở param cursor
                total,
                pageSize: limit,
                orderBy,
                sortOrder,
            },
        });
    }

    async getMyEvents(req, res) {
        const userID = req.user.uid;
        const events = await this.eventService.getEventsByOrgID(userID);

        if (!events || events.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const isOwner = events.some((e) => e.organizer.organizerID === userID);
        if (!isOwner) {
            throw new AppError({
                statusCode: 403,
                errorCode: ERROR_CODE.UNAUTHORIZED,
                message: "You are not allowed to access these events",
            });
        }

        return res.status(200).json({ success: true, data: events });
    }

    async getMyEventByID(req, res) {
        const userID = req.user.uid;
        const eventID = req.params.eventID;

        const event = await this.eventService.getEventByID(eventID, false);

        if (!event) {
            throw new AppError({
                statusCode: 404,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Event not found",
            });
        }

        if (event.organizer.organizerID !== userID) {
            throw new AppError({
                errorCode: ERROR_CODE.UNAUTHORIZED,
                statusCode: 403,
                message: "Unauthorized to access this event",
            });
        }

        return res.status(200).json({
            success: true,
            data: event,
        });
    }

    async createEvent(req, res) {
        const user = req.user;
        const eventData = req.body;

        const newEvent = await this.eventService.createEvent(user, eventData);

        return res.status(201).json({ success: true, data: newEvent });
    }

    async updateMyEvent(req, res) {
        const eventID = req.params.eventID;
        const userID = req.user.uid;

        // 1. Lấy sự kiện (sẽ sử dụng bộ đệm nếu có) để kiểm tra quyền
        const existingEvent = await this.eventService.getEventByID(eventID);
        if (!existingEvent) {
            throw new AppError({
                statusCode: 404,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Event not found",
            });
        }

        if (existingEvent.organizer.organizerID !== userID) {
            throw new AppError({
                statusCode: 403,
                errorCode: ERROR_CODE.UNAUTHORIZED,
                message: "You are not authorized to update this event",
            });
        }

        const updatedEvent = await this.eventService.updateEvent(
            eventID,
            req.body,
        );

        return res.status(200).json({ success: true, data: updatedEvent });
    }

    async publishEvent(req, res) {
        const user = req.user;
        const { eventID } = req.params;

        await this.eventService.publishEvent(eventID, user.uid);

        return res.status(200).json({
            success: true,
            message: "Event published successfully.",
        });
    }

    async cancelMyEvent(req, res) {
        const { eventID } = req.params;
        const userID = req.user.uid;

        const actor = {
            userID,
            username: req.user.name,
            email: req.user.email,
        };
        const result = await this.eventService.cancelEvent(
            eventID,
            actor,
            req.body.cancelledReason,
        );

        return res.status(200).json({ success: true, data: result });
    }

    async getEventAttendees(req, res) {
        const eventID = req.params.eventID;
        const event = await this.eventService.getEventByID(eventID);

        if (!event) {
            return res.status(404).json({
                success: false,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Not Found",
            });
        }

        if (event.organizer.organizerID !== req.user.uid) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to get attendees",
            });
        }

        const result = await this.eventService.getEventAttendees(eventID);

        if (!result) {
            return new AppError({
                statusCode: 404,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Not Found.",
            });
        }

        return res.status(200).json(result);
    }

    async createAttendee(req, res) {
        const { eventID } = req.params;
        const result = await this.eventService.createEventAttendee(
            eventID,
            req.body,
        );

        return res.status(200).json(result);
    }

    async createContributor(req, res) {
        const { eventID } = req.params;
        const result = await this.eventService.createContributor(
            eventID,
            req.body,
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }

    async updateContributor(req, res) {
        const { eventID, contributorID } = req.params;
        const result = await this.eventService.updateContributor(
            eventID,
            contributorID,
            req.body,
        );
        console.log(`RESULT: ${JSON.stringify(result)}`);

        return res.status(200).json({ success: true, data: result });
    }

    async removeContributor(req, res) {
        const userID = req.user.uid;
        const { eventID, contributorID } = req.params;

        await this.eventService.removeContributor(
            eventID,
            contributorID,
            userID,
        );

        return res.status(200).json({ success: true });
    }

    async getEventTicketTypes(req, res) {
        const eventID = req.params.eventID;

        const event = await this.eventService.getEventByID(eventID);
        if (!event) {
            return res.status(404).json({
                success: false,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Not Found",
            });
        }

        const ticketTypes =
            await this.eventService.getEventTicketTypes(eventID);

        if (ticketTypes === null) {
            return res.status(404).json({
                success: false,
                message: `Event with ID '${eventID}' not found.`,
            });
        }

        return res.status(200).json({ success: true, data: ticketTypes });
    }

    async getEventContributors(req, res) {}

    async getPublicEventDetail(req, res, next) {
        const raw = req.params.slug;
        const slug = decodeURIComponent(String(raw).trim());

        const eventData = await this.eventService.getPublicEventDetail(slug);

        if (!eventData) {
            return res.status(404).json({ error: "Event not found" });
        }

        if (eventData.__httpStatus === 410) {
            return res.status(410).json({
                success: true,
                data: eventData,
                message: "Event cancelled",
            });
        }

        return res.json({ success: true, data: eventData });
    }
}

// Helper:
function encodeCursor(cursor) {
    return cursor
        ? Buffer.from(JSON.stringify(cursor)).toString("base64")
        : null;
}

function decodeCursor(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch {
        return null;
    }
}
