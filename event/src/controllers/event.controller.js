import {
    AppError,
    catchAsync,
    ERROR_CODE,
} from "@event_ticket_booking_system/shared";

export default class EventController {
    constructor({ logger, eventService }) {
        this.logger = logger;
        this.eventService = eventService;

        this.getMyEvents = catchAsync(this.getMyEvents.bind(this));
        this.getMyEventByID = catchAsync(this.getMyEventByID.bind(this));
        this.createEvent = catchAsync(this.createEvent.bind(this));
        this.getMyEventDetail = catchAsync(this.getMyEventDetail.bind(this));
    }

    async getMyEvents(req, res) {
        const userID = req.user.uid;

        const events = await this.eventService.getEventsByOrgID(userID, false);
        const isOwner = events.some((e) => e.organizerID === userID);
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
        if (event.organizerID !== userID) {
            throw new AppError({
                errorCode: ERROR_CODE.UNAUTHORIZED,
                statusCode: 403,
                message: "Unauthorized to access this event in private mode",
            });
        }

        return res.status(200).json({
            success: true,
            data: event,
            message: "Get event sucessfully",
        });
    }

    async createEvent(req, res) {
        const data = this.eventService.createEvent(req.body);
        return res.status(200).json({ success: true, data });
    }

    async updateMyEvent(req, res) {
        const eventID = req.params.eventID;
        const userID = req.user.uid;

        const existingEvent = await this.getEventByID(eventID);
        if (!existingEvent) {
            throw new AppError({
                statusCode: 404,
                errorCode: ERROR_CODE.NOT_FOUND,
                message: "Event not found",
            });
        }

        if (existingEvent.organizerID !== userID) {
            throw new AppError({
                statusCode: 403,
                errorCode: ERROR_CODE.UNAUTHORIZED,
                message: "You are not authorized to update this event",
            });
        }
        await this.eventService.updatEvent(eventID, req.body);
    }
}
