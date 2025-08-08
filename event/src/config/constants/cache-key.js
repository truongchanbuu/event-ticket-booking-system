// constants/cacheKeys.js
export const CACHE_KEYS = {
    // TrackingKey gốc
    EVENT_TRACKING: (eventID) => `event:${eventID}`,

    // Event detail theo ID
    EVENT_BY_ID: (eventID) => `event:${eventID}:byID`,

    // Event detail theo slug
    EVENT_DETAIL_SLUG: (slug) => `event:slug:${slug}`,

    // Ticket types của event
    EVENT_TICKET_TYPES: (eventID) => `event:${eventID}:ticketTypes`,

    // Attendees của event
    EVENT_ATTENDEES: (eventID, params) =>
        `event:${eventID}:attendees:${stableStringify(params)}`,

    // List event theo organizer
    EVENTS_BY_ORG: (orgID) => `events:org:${orgID}`,
};
