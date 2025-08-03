// src/hooks/api/useEventAttendees.ts
import { QUERY_KEYS } from "@/constants/event";
import { AttendeeResponse, getAttendees } from "@/lib/api/events/api";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook để lấy danh sách người tham dự của một sự kiện.
 * @param eventID - ID của sự kiện.
 */
export function useEventAttendees(eventID: string) {
  const queryKey = QUERY_KEYS.eventAttendees(eventID);
  const attendeesQuery = useQuery<AttendeeResponse>({
    queryKey,
    queryFn: () => getAttendees(eventID),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(eventID),
  });

  return attendeesQuery;
}
