import { QUERY_KEYS } from "@/constants/event";
import {
  createOrganizerEvent,
  EventsResponse,
  getOrganizerEvents,
} from "@/lib/api/events/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook để quản lý danh sách sự kiện, bao gồm lấy dữ liệu,
 * tạo mới và xóa sự kiện.
 */
export function useProfileEvents(userID: string, params?) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.profileEvents(userID, params);

  const eventsQuery = useQuery<EventsResponse>({
    queryKey,
    queryFn: () => getOrganizerEvents(params),
    staleTime: 1000 * 60 * 5,
  });

  const createEventMutation = useMutation({
    mutationFn: createOrganizerEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    eventsQuery,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
  };
}
