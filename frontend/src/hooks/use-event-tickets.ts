import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/event";
import { getEventTicketTypes, TicketTypesResponse } from "@/lib/api/events/api";

/**
 * Hook để lấy danh sách các loại vé của một sự kiện.
 * @param eventID - ID của sự kiện. Hook sẽ không chạy nếu ID không được cung cấp.
 */
export function useEventTicketTypes(eventID: string) {
  const queryKey = QUERY_KEYS.eventTicketTypes(eventID);

  const ticketTypesQuery = useQuery<TicketTypesResponse>({
    queryKey,
    queryFn: () => getEventTicketTypes(eventID),
    enabled: Boolean(eventID),
    staleTime: 1000 * 60 * 5,
  });

  return ticketTypesQuery;
}
