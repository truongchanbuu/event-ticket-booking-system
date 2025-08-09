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

// slugs collection: doc id = slug, data = { eventID, createdAt }
export async function reserveUniqueSlugTx(
    db,
    tx,
    baseSlug,
    eventID,
    { maxAttempts = 5 } = {},
) {
    let attempt = 0;
    while (attempt < maxAttempts) {
        const candidate =
            attempt === 0
                ? `${baseSlug}-${shortSuffixFromId(eventID)}`
                : `${baseSlug}-${shortSuffixFromId(eventID)}-${attempt + 1}`;

        // blacklist
        if (
            ["admin", "api", "login", "logout", "me", "events"].includes(
                candidate,
            )
        ) {
            attempt++;
            continue;
        }

        const slugRef = db.collection("slugs").doc(candidate);
        const snap = await tx.get(slugRef);
        if (!snap.exists) {
            tx.set(slugRef, { eventID, createdAt: Date.now() });
            return candidate;
        }
        attempt++;
    }
    throw new AppError({
        statusCode: 409,
        message: "Cannot allocate unique slug",
    });
}
