export class TicketClientService {
    constructor({ httpRegistry, logger = console }) {
        if (!httpRegistry?.tickets) {
            throw new Error(
                "[TicketClientService] httpRegistry.tickets missing",
            );
        }
        this.http = httpRegistry.tickets; // đã có baseURL + x-api-key sẵn
        this.logger = logger;
    }

    _path(eventId) {
        return `/internal/tickets/${encodeURIComponent(eventId)}`;
    }

    async getEventTicketTypes(eventId, opts = {}) {
        if (typeof eventId !== "string" || !eventId.trim()) {
            this.logger.warn("[TicketClientService] Invalid eventId", {
                eventId,
            });
            return { status: 400, data: [] };
        }

        try {
            const res = await this.http.get(this._path(eventId), {
                signal: opts.signal,
                headers: opts.headers, // nếu muốn propagate thêm (x-request-id đã tự add ở factory)
            });

            const status = typeof res?.status === "number" ? res.status : 502;
            const data = Array.isArray(res?.data) ? res.data : [];
            const version = res?.version;

            if (status !== 200) {
                this.logger.warn(
                    "[TicketClientService] Non-200 from ticket service",
                    { eventId, status, message: res?.message },
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
