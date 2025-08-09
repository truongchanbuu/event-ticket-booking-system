export class SlugService {
    constructor({ db }) {
        this.db = db;
        this.CACHE_KEYS = {
            EVENT_DETAIL_SLUG: (slug) => `event:slug:${slug}:detail`,
        };
    }

    async updateEventSlug(eventID, newTitleOrSlug, opts = {}) {
        const eventsCol = this.db.collection(EVENTS_COLLECTION);
        const slugsCol = this.db.collection("slugs");

        // 1) Chuẩn hoá base
        const rawBase = createEventSlug(newTitleOrSlug);
        const base = capBaseSlug(rawBase);
        const suffix = shortSuffixFromId(eventID);
        const baseBlocked = SLUG_BLACKLIST.has(base);

        let newSlugFinal = null;
        let oldSlugFinal = null;

        await this.db.runTransaction(async (tx) => {
            // 2) Lấy event hiện tại
            const evRef = eventsCol.doc(eventID);
            const evSnap = await tx.get(evRef);
            if (!evSnap.exists) {
                throw new AppError({
                    statusCode: 404,
                    message: "Event not found",
                });
            }
            const ev = evSnap.data();
            const oldSlug = String(ev.slug || "").trim();
            oldSlugFinal = oldSlug;

            // Nếu base sau chuẩn hoá dẫn tới cùng slug cũ (idempotent early-exit)
            // ví dụ FE gửi lại đúng slug hiện tại
            const trySame = `${base}${baseBlocked ? "-x" : ""}-${suffix}`;
            if (oldSlug && oldSlug === trySame) {
                newSlugFinal = oldSlug;
                return; // không cần đổi gì
            }

            // 3) Tìm slug mới duy nhất
            const MAX_ATTEMPTS = 5;
            let attempt = 0;
            let candidate = null;
            while (attempt < MAX_ATTEMPTS) {
                candidate =
                    attempt === 0
                        ? `${base}${baseBlocked ? "-x" : ""}-${suffix}`
                        : `${base}${baseBlocked ? "-x" : ""}-${suffix}-${attempt + 1}`;

                const idxRef = slugsCol.doc(candidate);
                const idxSnap = await tx.get(idxRef);

                if (!idxSnap.exists) {
                    // Reserve mới
                    tx.set(idxRef, { eventID, createdAt: Date.now() });
                    newSlugFinal = candidate;
                    break;
                } else {
                    const data = idxSnap.data();
                    if (data?.eventID === eventID) {
                        // Idempotent: slug này đã map đúng event hiện tại
                        newSlugFinal = candidate;
                        break;
                    }
                }
                attempt++;
            }

            // Fallback random (rất hiếm)
            if (!newSlugFinal) {
                const rand = Math.random().toString(36).slice(2, 6);
                candidate = `${capBaseSlug(base, 1 + 6 + 1 + 4)}-${suffix}-${rand}`;
                const idxRef = slugsCol.doc(candidate);
                const idxSnap = await tx.get(idxRef);
                if (!idxSnap.exists) {
                    tx.set(idxRef, { eventID, createdAt: Date.now() });
                    newSlugFinal = candidate;
                } else if (idxSnap.data()?.eventID === eventID) {
                    newSlugFinal = candidate;
                } else {
                    throw new AppError({
                        statusCode: 409,
                        message: "Cannot allocate unique slug",
                    });
                }
            }

            // 4) Xoá slug cũ (nếu khác và tồn tại)
            if (oldSlug && newSlugFinal !== oldSlug) {
                const oldRef = slugsCol.doc(oldSlug);
                const oldSnap = await tx.get(oldRef);
                if (oldSnap.exists && oldSnap.data()?.eventID === eventID) {
                    tx.delete(oldRef);
                }
            }

            // 5) Update event doc
            tx.update(evRef, {
                slug: newSlugFinal,
                updatedAt: new Date().toISOString(), // bạn muốn ISO string
                // (tuỳ chọn) updatedBy: opts.actor?.uid ?? null,
            });
        });

        // 6) Invalidate cache (detail cũ/mới + tracking theo eventID)
        try {
            if (oldSlugFinal && oldSlugFinal !== newSlugFinal) {
                await this.redisService.del?.(
                    this.CACHE_KEYS.EVENT_DETAIL_SLUG(oldSlugFinal),
                );
            }
            await this.redisService.del?.(
                this.CACHE_KEYS.EVENT_DETAIL_SLUG(newSlugFinal),
            );
            await this.cache.invalidateByTrackingKey?.(
                this.CACHE_KEYS.EVENT_TRACKING(eventID),
            );
        } catch (e) {
            this.logger?.warn?.(
                "[updateEventSlug] cache invalidate failed:",
                e?.message,
            );
        }

        return { eventID, oldSlug: oldSlugFinal, newSlug: newSlugFinal };
    }
}
