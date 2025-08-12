export class EventInventoryClient {
    constructor({ httpRegistry, logger = this.logger }) {
        if (!httpRegistry?.events) {
            throw new Error(
                "[EventInventoryClient] httpRegistry.events missing",
            );
        }
        this.http = httpRegistry.events;
        this.logger = logger;
    }

    _reservePath(ttId) {
        return `/internal/inventory/${encodeURIComponent(ttId)}/reserve`;
    }
    _releasePath(ttId) {
        return `/internal/inventory/${encodeURIComponent(ttId)}/release`;
    }

    /**
     * Reserve inventory for a ticket type
     * @param {string} ttId
     * @param {{ qty:number, eventId?:string, hint?:any, slug?:string }} body
     * @param {{ signal?: AbortSignal, headers?: Record<string,string> }} [opts]
     * @returns {Promise<any>} // { ok, shardIndex, newRemaining } | { ok:false, error }
     */
    async reserve(ttId, body, opts = {}) {
        if (typeof ttId !== "string" || !ttId.trim()) {
            this.logger.warn("[EventInventoryClient] reserve: invalid ttId", {
                ttId,
            });
            return { ok: false, error: "INVALID_TICKET_TYPE" };
        }

        const res = await this.http.post(this._reservePath(ttId), body, {
            signal: opts.signal,
            headers: opts.headers,
        });

        if (res.status !== 200) {
            this.logger.warn("[EventInventoryClient] reserve non-200", {
                ttId,
                status: res.status,
                message: res.message,
            });
        }
        return res.data ?? { ok: false, error: "RESERVE_FAILED" };
    }

    /**
     * Release inventory
     * @param {string} ttId
     * @param {{ qty:number, shardIndex:number, eventId?:string, slug?:string }} body
     * @param {{ signal?: AbortSignal, headers?: Record<string,string> }} [opts]
     * @returns {Promise<any>} // { ok, newRemaining } | { ok:false, error }
     */
    async release(ttId, body, opts = {}) {
        if (typeof ttId !== "string" || !ttId.trim()) {
            this.logger.warn("[EventInventoryClient] release: invalid ttId", {
                ttId,
            });
            return { ok: false, error: "INVALID_TICKET_TYPE" };
        }

        const res = await this.http.post(this._releasePath(ttId), body, {
            signal: opts.signal,
            headers: opts.headers,
        });

        if (res.status !== 200) {
            this.logger.warn("[EventInventoryClient] release non-200", {
                ttId,
                status: res.status,
                message: res.message,
            });
        }
        return res.data ?? { ok: false, error: "RELEASE_FAILED" };
    }
}
