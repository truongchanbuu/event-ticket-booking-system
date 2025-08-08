/**
 * Sanitize event data for public display (e.g. client app or public API)
 * @param {object} event - Full event document from Firestore
 * @returns {object} Sanitized public event data
 */
export function sanitizePublicEvent(event) {
    if (!event) return null;

    const {
        eventID,
        organizer,
        title,
        slug,
        description,
        images = [],
        categories = [],
        location,
        startTime,
        endTime,
        ticketTypes = [],
        status,
        stats,
    } = event;

    const publicTicketTypes = ticketTypes.map((t) => ({
        name: t.name,
        price: t.price,
        totalQuantity: t.totalQuantity,
        remaining: t.remaining ?? 0,
    }));

    return {
        eventID,
        organizer,
        title,
        description,
        images,
        categories,
        location,
        startTime,
        endTime,
        slug,
        ticketTypes: publicTicketTypes,
        status,
        stats,
    };
}
