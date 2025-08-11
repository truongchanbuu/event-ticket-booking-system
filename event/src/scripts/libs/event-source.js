export class EventSource {
    constructor(cfg) {
        this.cfg = cfg;
        this.log = cfg.logger || console;
    }

    async listActiveEventIds() {
        const { mode } = this.cfg;
        if (mode === "service") return this._listFromService();
        if (mode === "firestore") return this._listFromFirestore();
        throw new Error(`[EventSource] unsupported mode: ${mode}`);
    }

    async _listFromService() {
        const { eventServiceUrl, eventServiceKey, http } = this.cfg;
        if (!eventServiceUrl || !http) {
            throw new Error(
                "[EventSource] service mode requires eventServiceUrl & http",
            );
        }

        const url = `${eventServiceUrl}/api/internal/events/ids`;
        const res = await http.get({ url, apiKey: eventServiceKey });

        if (res.status !== 200) {
            this.log.warn("[EventSource] service non-200", {
                status: res.status,
            });
            return [];
        }

        const { eventIDs = [] } = res.data || {};
        return eventIDs;
    }

    async _listFromFirestore() {
        const { firestore } = this.cfg;
        if (!firestore)
            throw new Error("[EventSource] firestore instance required");
        const snap = await firestore
            .collection("events")
            .where("status", "==", "published")
            .get();
        return snap.docs.map((d) => d.id);
    }
}
