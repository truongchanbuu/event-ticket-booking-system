import slugify from "slugify";
export function createEventSlug(title) {
    return slugify(title || "", {
        lower: true,
        strict: true,
        trim: true,
    });
}

export function shortSuffixFromId(id) {
    return id.slice(-6).toLowerCase();
}

const SLUG_BLACKLIST = new Set([
    "admin",
    "api",
    "login",
    "logout",
    "me",
    "events",
    "privacy",
    "terms",
]);

function capBaseSlug(base, suffixExtraLen = 8 /* '-' + 6 + maybe '-N' */) {
    const MAX_TOTAL = 70;
    const maxBase = Math.max(10, MAX_TOTAL - suffixExtraLen);
    return base.slice(0, maxBase);
}

// slugs collection: doc id = slug, data = { eventID, createdAt }
export async function reserveUniqueSlugTx(
    db,
    tx,
    baseSlug,
    eventID,
    { maxAttempts = 5 } = {},
) {
    const base = capBaseSlug(baseSlug);
    const suffix = shortSuffixFromId(eventID);

    // Blacklist theo base
    const baseBlocked = SLUG_BLACKLIST.has(base);
    let attempt = 0;

    while (attempt < maxAttempts) {
        const candidate =
            attempt === 0
                ? `${base}${baseBlocked ? "-x" : ""}-${suffix}`
                : `${base}${baseBlocked ? "-x" : ""}-${suffix}-${attempt + 1}`;

        // (tuỳ chọn) nếu muốn chặn theo candidate luôn:
        // if (SLUG_BLACKLIST.has(candidate)) { attempt++; continue; }

        const slugRef = db.collection("slugs").doc(candidate);
        const snap = await tx.get(slugRef);

        if (!snap.exists) {
            tx.set(slugRef, { eventID, createdAt: Date.now() });
            return candidate;
        }

        // Idempotent: nếu map đã trỏ đúng eventID hiện tại -> trả luôn
        const data = snap.data();
        if (data?.eventID === eventID) {
            return candidate;
        }

        attempt++;
    }

    // Fallback: thêm random ngắn, xác suất đụng cực thấp
    const rand = Math.random().toString(36).slice(2, 6);
    const candidate = `${capBaseSlug(baseSlug, 1 + 6 + 1 + 4)}-${suffix}-${rand}`;
    const slugRef = db.collection("slugs").doc(candidate);
    const snap = await tx.get(slugRef);
    if (!snap.exists) {
        tx.set(slugRef, { eventID, createdAt: Date.now() });
        return candidate;
    }

    throw new AppError({
        statusCode: 409,
        message: "Cannot allocate unique slug",
    });
}
