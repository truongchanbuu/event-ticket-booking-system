import { QUERY_KEYS } from "@/constants/event";
import {
  EventReponse,
  getEventByID,
  updateOrganizerEvent,
} from "@/lib/api/events/api";
import { Event } from "@/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Hook để quản lý chi tiết một sự kiện, bao gồm lấy dữ liệu
 * và cập nhật sự kiện đó.
 * @param eventID - ID của sự kiện. Hook sẽ không hoạt động nếu không có ID.
 */
export function useEventDetail(eventID: string) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.eventDetail(eventID);

  /**
   * Query để lấy chi tiết một sự kiện dựa trên ID.
   */
  const eventQuery = useQuery<EventReponse>({
    queryKey,
    queryFn: () => getEventByID(eventID),
    staleTime: 1000 * 60 * 5, // 5 phút
  });

  /**
   * Mutation để cập nhật một sự kiện với Cập nhật lạc quan (Optimistic Update).
   */
  const updateEventMutation = useMutation({
    mutationFn: (data: Partial<Event>) => updateOrganizerEvent(eventID, data),

    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<EventReponse>(queryKey);

      if (previousData) {
        // Cập nhật giao diện ngay lập tức với dữ liệu mới
        queryClient.setQueryData<EventReponse>(queryKey, {
          ...previousData,
          data: {
            ...previousData.data,
            ...updatedData, // Gộp dữ liệu cũ và dữ liệu mới cập nhật
          },
        });
      }
      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    eventQuery,
    updateEvent: updateEventMutation.mutateAsync,
    isUpdating: updateEventMutation.isPending,
  };
}
