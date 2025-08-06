export const QUERY_KEYS = {
  eventDetail: (eventID: string) => ["event-detail", eventID],
  profileEvents: (userID?: string, params?) => [
    "profile-events",
    userID,
    { ...params },
  ],
  eventAttendees: (eventID: string, params?: object) => [
    "eventAttendees",
    eventID,
    params,
  ],
  eventTicketTypes: (eventID: string) => ["event-tickets", eventID],
  eventContributors: (eventID: string) => ["event-contributors", eventID],
};
