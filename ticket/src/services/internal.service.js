import axios from "axios";
import { AppError, ERROR_CODE } from "@event_ticket_booking_system/shared";

export class InternalService {
    constructor({ config }) {
        this.eventUrl = config.service_urls.event_service;
        this.eventServiceKey = config.service_keys.event_service;
    }

    async isEventOrganizer(eventID, uid) {
        const url = `${this.eventUrl}/internal/events/${eventID}/get-organizer-id`;

        try {
            const response = await axios.get(url, {
                headers: {
                    "x-api-key": this.eventServiceKey,
                },
                timeout: 3000, // ⏰ quan trọng để tránh treo nếu service kia chết
            });

            const organizerId = response.data?.data;

            if (!organizerId) {
                throw new AppError({
                    message: "Organizer ID not found in response",
                    statusCode: 500,
                    errorCode: ERROR_CODE.INTERNAL_SERVER_ERROR,
                });
            }

            return organizerId === uid;
        } catch (error) {
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
