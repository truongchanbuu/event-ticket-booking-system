import {
    AppError,
    catchAsync,
    ERROR_CODE,
} from "@event_ticket_booking_system/shared";
import { EVENT_STATUS } from "../enums/event-status.js";

export class EventController {
    constructor({ logger, eventService }) {
        this.logger = logger;
        this.eventService = eventService;

        this.getMyEvents = catchAsync(this.getMyEvents.bind(this));
        this.getMyEventByID = catchAsync(this.getMyEventByID.bind(this));
        this.createEvent = catchAsync(this.createEvent.bind(this));
        this.updateMyEvent = catchAsync(this.updateMyEvent.bind(this));
        this.getEventAttendees = catchAsync(this.getEventAttendees.bind(this));
        this.getEventTicketTypes = catchAsync(
            this.getEventTicketTypes.bind(this),
        );
        this.cancelMyEvent = catchAsync(this.cancelMyEvent.bind(this));
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

    async cancelMyEvent(req, res) {
        const { eventID } = req.params;
        const userID = req.user.uid;

        const event = await this.eventService.getEventByID(eventID);
        if (!event) {
            return res
                .status(404)
                .json({ success: false, message: "Failed to cancel." });
        }

        if (event.organizer.organizerID !== userID) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to cancel this event.",
            });
        }

        // if ((event?.stats?.participantCount || 0) > 0) {
        // }

        if (event.status === EVENT_STATUS.CANCELLED) {
            return res.status(200).json({
                success: true,
                message: "Event has been cancelled.",
                data: event,
            });
        }

        const updatedData = {
            cancelledReason: "No reason provided.",
            ...req.body,
            status: EVENT_STATUS.CANCELLED,
            cancelledAt: new Date().toISOString(),
            cancelledBy: "self",
        };

        const result = await this.eventService.updateEvent(
            eventID,
            updatedData,
        );

        console.log(`res: ${JSON.stringify(result)}`);

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

        const attendees = await this.eventService.getEventAttendees(eventID);

        if (attendees === null) {
            return res.status(404).json({
                success: false,
                message: `Event with ID '${eventID}' not found.`,
            });
        }

        return res.status(200).json({ success: true, data: attendees });
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
}
