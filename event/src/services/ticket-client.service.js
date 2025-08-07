export class TicketClientService {
    constructor({ config, logger = console, internalHttpClient }) {
        this.ticketUrl = config.service_urls.ticket_service;
        this.ticketServiceKey = config.service_keys.ticket_service;
        console = logger;
        this.internalGet = internalHttpClient.get;
    }

    async getEventTicketTypes(eventID) {
        if (!eventID || typeof eventID !== "string") {
            console.warn("[getEventTicketTypes] Invalid eventID", {
                eventID,
            });
            return [];
        }

        const url = `${this.ticketUrl}/internal/tickets/${eventID}`;

        try {
            const response = await this.internalGet({
                url,
                apiKey: this.ticketServiceKey,
            });

            console.log(`response in get tickets: ${JSON.stringify(response)}`);

            if (response.status === 200 && Array.isArray(response.data)) {
                return response.data;
            }

            console.error("[getEventTicketTypes] Unexpected response", {
                eventID,
                status: response.status,
                data: response.data,
            });

            return [];
        } catch (error) {
            if (error.code === "ECONNABORTED") {
                console.error("[getEventTicketTypes] Timeout", {
                    eventID,
                    timeout: 3000,
                });
            } else if (error.code === "ECONNRESET") {
                console.error("[getEventTicketTypes] Connection reset", {
                    eventID,
                    message: error.message,
                });
            } else if (error.response) {
                console.error("[getEventTicketTypes] Error response", {
                    eventID,
                    status: error.response.status,
                    data: error.response.data,
                });
            } else {
                console.error("[getEventTicketTypes] Unknown network error", {
                    eventID,
                    message: error.message,
                    stack: error.stack,
                });
            }

            return [];
        }
    }
}
