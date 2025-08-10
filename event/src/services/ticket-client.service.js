export class TicketClientService {
    constructor({ config, logger = console, internalHttpClient }) {
        this.ticketUrl = config.service_urls.ticket_service;
        this.ticketServiceKey = config.service_keys.ticket_service;
        this.logger = logger;
        this.http = internalHttpClient;
    }

    _ticketsUrl(eventId) {
        return `${this.ticketUrl}/internal/tickets/${eventId}`;
    }

    async getEventTicketTypes(eventId) {
        if (typeof eventId !== "string" || !eventId.trim()) {
            this.logger.warn("[TicketClientService] Invalid eventId", {
                eventId,
            });
            return { status: 400, data: [] };
        }

        try {
            const res = await this.http.get({
                url: this._ticketsUrl(eventId),
                apiKey: this.ticketServiceKey,
            });
            const status = typeof res?.status === "number" ? res.status : 502;
            const data = Array.isArray(res?.data) ? res.data : [];
            const version = res?.version;

            if (status !== 200) {
                this.logger.warn(
                    "[TicketClientService] Non-200 from ticket service",
                    {
                        eventId,
                        status,
                        message: res?.message,
                    },
                );
            }

            return { status, data, version };
        } catch (err) {
            this.logger.error(
                "[TicketClientService] getEventTicketTypes failed",
                {
                    eventId,
                    message: err?.message,
                    code: err?.code,
                },
            );
            return { status: 503, data: [] };
        }
    }
}
