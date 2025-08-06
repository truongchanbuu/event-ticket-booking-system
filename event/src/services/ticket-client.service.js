import config from "../config";

export class TicketClient {
    TICKET_SERVICE_URL = config.service_urls.ticket_service;
    TICKET_SERVICE_SECRET_KEY = config.service_keys.ticket_service;

    async createTicket(ticketData) {
        try {
            const res = await fetch(
                `${this.TICKET_SERVICE_URL}/api/tickets/manual`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.TICKET_SERVICE_SECRET_KEY}`,
                    },
                    body: JSON.stringify(ticketData),
                },
            );

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `[TicketService] Failed: ${res.status} - ${errorText}`,
                );
            }

            return await res.json();
        } catch (err) {
            console.error("Error calling ticket-service:", err.message);
            throw err;
        }
    }
}
