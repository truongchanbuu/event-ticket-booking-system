import {
    AppError,
    catchAsync,
    ERROR_CODE,
} from "@event_ticket_booking_system/shared";

export class EventController {
    constructor({ logger, eventService }) {
        this.logger = logger;
        this.eventService = eventService;

        this.getMyEvents = catchAsync(this.getMyEvents.bind(this));
        this.getMyEventByID = catchAsync(this.getMyEventByID.bind(this));
        this.createEvent = catchAsync(this.createEvent.bind(this));
        this.updateMyEvent = catchAsync(this.updateMyEvent.bind(this));
        this.cancelMyEvent = catchAsync(this.cancelMyEvent.bind(this));

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
}
