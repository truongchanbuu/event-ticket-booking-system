/**
 * Sanitize event data for public display (client apps / public API).
 * - Whitelist only public-safe fields
 * - Normalize primitives & arrays
 * - Compute handy derived fields for UI
 *
 * @param {any} event - Full event document from DB
 * @returns {{
 *   eventID?: string;
 *   organizer: { organizerID: string; name: string; photoUrl?: string };
 *   title: string;
 *   description: string;
 *   slug: string;
 *   images: string[];
 *   categories: string[];
 *   location: { address: string; coordinates?: { latitude: number; longitude: number } };
 *   startTime: string; // ISO
 *   endTime: string;   // ISO
 *   ticketTypes: {
 *     name: string;
 *     price: number;
 *     currency?: string;
 *     totalQuantity: number;
 *     remaining: number;
 *     isSoldOut: boolean;
 *   }[];
 *   status: string;
 *   stats: { participantCount: number; checkInCount: number; totalTickets: number; ticketSoldCount: number };
 *   // derived helpers
 *   isAllSoldOut: boolean;
 *   lowestPrice?: number;
 *   currency?: string;
 *   coverImage?: string;
 * } | null}
 */
export function sanitizePublicEvent(event) {
    if (!event || typeof event !== "object") return null;

    // --- helpers
    const toIso = (v) => {
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const clampCoord = (lat, lon) => {
        const clampedLat = Math.max(-90, Math.min(90, Number(lat)));
        const clampedLon = Math.max(-180, Math.min(180, Number(lon)));
        if (Number.isFinite(clampedLat) && Number.isFinite(clampedLon)) {
            return { latitude: clampedLat, longitude: clampedLon };
        }
        return undefined;
    };

    const isNonEmptyString = (x) =>
        typeof x === "string" && x.trim().length > 0;

    const asNumber = (x, def = 0) => {
        const n = Number(x);
        return Number.isFinite(n) ? n : def;
    };

    const onlyValidUrls = (arr) =>
        (Array.isArray(arr) ? arr : [])
            .map((u) => (isNonEmptyString(u) ? String(u).trim() : ""))
            .filter((u) => /^https?:\/\/|^\/\//i.test(u)); // đơn giản: http(s) hoặc protocol-relative

    // --- whitelist core fields
    const eventID = isNonEmptyString(event.eventID) ? event.eventID : undefined;

    const organizer = {
        organizerID: isNonEmptyString(event?.organizer?.organizerID)
            ? event.organizer.organizerID
            : "",
        name: isNonEmptyString(event?.organizer?.name)
            ? event.organizer.name
            : "",
        ...(isNonEmptyString(event?.organizer?.photoUrl)
            ? { photoUrl: event.organizer.photoUrl }
            : {}),
    };

    const title = isNonEmptyString(event.title) ? event.title : "";
    const description = isNonEmptyString(event.description)
        ? event.description
        : "";
    const slug = isNonEmptyString(event.slug) ? event.slug : "";

    const images = onlyValidUrls(event.images);
    const categories = (Array.isArray(event.categories) ? event.categories : [])
        .map((c) => String(c).trim())
        .filter(Boolean);

    const location = {
        address: isNonEmptyString(event?.location?.address)
            ? event.location.address
            : "",
        ...(event?.location?.coordinates
            ? {
                  coordinates: clampCoord(
                      event.location.coordinates.latitude,
                      event.location.coordinates.longitude,
                  ),
              }
            : {}),
    };

    const startTime = toIso(event.startTime);
    const endTime = toIso(event.endTime);

    const status = isNonEmptyString(event.status) ? event.status : "DRAFT";

    const stats = {
        participantCount: asNumber(event?.stats?.participantCount, 0),
        checkInCount: asNumber(event?.stats?.checkInCount, 0),
        totalTickets: asNumber(event?.stats?.totalTickets, 0),
        ticketSoldCount: asNumber(event?.stats?.ticketSoldCount, 0),
    };

    // --- ticket types (public-safe)
    const ticketTypesRaw = Array.isArray(event.ticketTypes)
        ? event.ticketTypes
        : [];
    const ticketTypes = ticketTypesRaw.map((t) => {
        const total = asNumber(t?.totalQuantity, 0);
        const remaining = asNumber(
            // ưu tiên availableQuantity/remaining nếu đã tính sẵn
            t?.availableQuantity ?? t?.remaining,
            Math.max(total - asNumber(t?.soldQuantity, 0), 0),
        );

        return {
            name: isNonEmptyString(t?.name) ? t.name : "",
            price: asNumber(t?.price, 0),
            currency: isNonEmptyString(t?.currency) ? t.currency : undefined,
            totalQuantity: total,
            remaining,
            isSoldOut: remaining <= 0,
        };
    });

    // --- derived helpers for UI
    const coverImage = images[0];
    const isAllSoldOut =
        ticketTypes.length > 0 && ticketTypes.every((t) => t.isSoldOut);

    let lowestPrice = undefined;
    let currency = undefined;
    if (ticketTypes.length > 0) {
        const prices = ticketTypes
            .map((t) => t.price)
            .filter((p) => Number.isFinite(p));
        if (prices.length > 0) lowestPrice = Math.min(...prices);
        // chọn currency của ticket rẻ nhất nếu có
        const cheapest = ticketTypes.reduce(
            (acc, t) => (acc && acc.price <= t.price ? acc : t),
            ticketTypes[0],
        );
        currency = cheapest?.currency;
    }

    // --- tuyệt đối không lộ các field nhạy cảm (cancelledBy, cancelledReason, ...)
    return {
        eventID,
        organizer,
        title,
        description,
        images,
        categories,
        location,
        startTime: startTime ?? "",
        endTime: endTime ?? "",
        slug,
        ticketTypes,
        status,
        stats,

        // derived
        isAllSoldOut,
        lowestPrice,
        currency,
        coverImage,
    };
}
