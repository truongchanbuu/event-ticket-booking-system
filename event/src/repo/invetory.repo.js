import { FieldValue } from "firebase-admin/firestore";

export class InventoryMetaRepo {
    constructor({ db }) {
        this.col = db.collection("inventoryMeta");
    }

    async get(ttId) {
        const snap = await this.col.doc(String(ttId)).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }

    /**
     * Idempotent upsert. Không đụng hot path.
     */
    async upsert({ ttId, eventID, capacity, shardCount, version }) {
        if (!ttId || !eventID) throw new Error("ttId & eventID required");
        const ref = this.col.doc(String(ttId));

        await ref.set(
            {
                ttId,
                eventID,
                capacity,
                shardCount,
                version: Number.isFinite(version) ? version : 0,
                lastSeedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
    }

    async touchSync(ttId, { version, negativesDetected }) {
        const ref = this.col.doc(String(ttId));
        const upd = {
            lastSyncAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (Number.isFinite(version)) upd.version = version;
        if (typeof negativesDetected === "boolean")
            upd.negativesDetected = negativesDetected;
        await ref.set(upd, { merge: true });
    }
}
