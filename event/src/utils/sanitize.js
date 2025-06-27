/**
 * Sanitize event data for public display (e.g. client app or public API)
 * @param {object} event - Full event document from Firestore
 * @returns {object} Sanitized public event data
 */
export function sanitizePublicEvent(event) {
    if (!event) return null;

    const {
        eventID,
        organizerID,
        organizerName,
        eventTitle,
        eventDesc,
        coverImages = [],
        category = [],
        location,
        startTime,
        endTime,
        ticketTypes = [],
        status,
    } = event;

    const publicTicketTypes = ticketTypes.map((t) => ({
        typeID: t.typeID,
        name: t.name,
        price: t.price,
        remaining: t.remaining,
        maxPerUser: t.maxPerUser ?? undefined, // optional
    }));

    return {
        eventID,
        organizerID,
        organizerName,
        eventTitle,
        eventDesc,
        coverImages,
        category,
        location,
        startTime,
        endTime,
        ticketTypes: publicTicketTypes,
        status,
    };
}
