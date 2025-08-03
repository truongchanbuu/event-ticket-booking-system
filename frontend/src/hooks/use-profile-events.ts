// Gợi ý đặt tại: src/hooks/api/useEvents.ts

import { QUERY_KEYS } from "@/constants/event";
import {
  createOrganizerEvent,
  deleteOrganizerEvent,
  EventsResponse,
  getOrganizerEvents,
} from "@/lib/api/events/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook để quản lý danh sách sự kiện, bao gồm lấy dữ liệu,
 * tạo mới và xóa sự kiện.
 */
export function useProfileEvents(params?, userID?) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.profileEvents(userID, params);

  /**
   * Query để lấy danh sách tất cả sự kiện.
   */
  const eventsQuery = useQuery<EventsResponse>({
    queryKey,
    queryFn: () => getOrganizerEvents(params),
    staleTime: 1000 * 60 * 5,
  });

  /**
   * Mutation để tạo một sự kiện mới.
   */
  const createEventMutation = useMutation({
    mutationFn: createOrganizerEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Mutation để xóa một sự kiện với Cập nhật lạc quan (Optimistic Update).
   */
  const deleteEventMutation = useMutation({
    mutationFn: deleteOrganizerEvent,
    onMutate: async (eventIDToDelete) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<EventsResponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<EventsResponse>(queryKey, {
          ...previousData,
          data: previousData.data.filter(
            (event) => event.eventID !== eventIDToDelete
          ),
        });
      }

      // Trả về dữ liệu cũ để có thể khôi phục nếu xảy ra lỗi
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Nếu có lỗi, khôi phục lại dữ liệu giao diện như ban đầu
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    eventsQuery,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutateAsync,
    isDeleting: deleteEventMutation.isPending,
  };
}
