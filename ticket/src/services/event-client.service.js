import { AppError, ERROR_CODE } from "@event_ticket_booking_system/shared";

export class EventClientService {
    constructor({ config, internalHttpClient }) {
        this.eventUrl = config.service_urls.event_service;
        this.eventServiceKey = config.service_keys.event_service;
        this.internalGet = internalHttpClient.get;
    }

    async isEventOrganizer(eventID, uid) {
        if (!eventID) return [];
        const url = `${this.eventUrl}/internal/events/${eventID}/get-organizer-id`;

        try {
            const response = await this.internalGet({
                url,
                apiKey: this.eventServiceKey,
            });

            const organizerId = response.data;
            if (!organizerId) {
                return new AppError({
                    message: "Not Found.",
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                });
            }

            if (!organizerId) {
                throw new AppError({
                    message: "Organizer ID not found in response",
                    statusCode: 500,
                    errorCode: ERROR_CODE.INTERNAL_ERROR,
                });
            }

            return organizerId === uid;
        } catch (error) {
            console.log(`ERROR: ${error}`);
            const isAxiosError = error.isAxiosError;

            const status = error.response?.status || 500;
            const responseData = error.response?.data;

            console.error("Authorization error:", {
                eventID,
                uid,
                status,
                responseData,
                message: error.message,
            });

            if (isAxiosError && status === 404) {
                throw new AppError({
                    message: "Event not found",
                    statusCode: 404,
                    errorCode: ERROR_CODE.NOT_FOUND,
                });
            }

            throw new AppError({
                message: "Failed to authorize organizer",
                statusCode: 401,
                errorCode: ERROR_CODE.AUTH_INVALID_CREDENTIAL,
            });
        }
    }
}
