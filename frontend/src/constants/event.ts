export const QUERY_KEYS = {
  eventDetail: (eventID: string) => ["event-detail", eventID],
  profileEvents: (userID?: string, params?) => [
    "profile-events",
    userID,
    { ...params },
  ],
  eventAttendees: (eventID: string) => ["event-attendees", eventID],
  eventTicketTypes: (eventID: string) => ["event-tickets", eventID],
};
