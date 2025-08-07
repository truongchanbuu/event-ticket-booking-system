import { QUERY_KEYS } from "@/constants/event";
import {
  cancelEvent,
  EventReponse,
  getEventByID,
  publishEventAPI,
  updateOrganizerEvent,
} from "@/lib/api/events/api";
import { Event } from "@/schema";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "./use-toast";

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
    staleTime: 1000 * 60 * 5,
  });

  const updateEventMutation = useMutation({
    mutationFn: (data: Partial<Event>) => updateOrganizerEvent(eventID, data),

    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<EventReponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<EventReponse>(queryKey, {
          ...previousData,
          data: {
            ...previousData.data,
            ...updatedData,
          },
        });
      }
      return { previousData };
    },

    onSuccess: () => {
      toast({ variant: "success", title: "Update successfully." });
    },

    onError: (_err, _variables, context) => {
      toast({ variant: "destructive", title: "Failed to update." });
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileEvents() });
    },
  });

  const publishEventMutation = useMutation({
    mutationFn: () => publishEventAPI(eventID),

    // --- BẮT ĐẦU THÊM OPTIMISTIC UPDATE ---
    onMutate: async () => {
      // 1. Hủy các query đang chạy
      await queryClient.cancelQueries({ queryKey });

      // 2. Backup dữ liệu cũ
      const previousData = queryClient.getQueryData<EventReponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<EventReponse>(queryKey, {
          ...previousData,
          data: {
            ...previousData.data,
            status: EVENT_STATUS.PUBLISHED,
            publishedAt: new Date().toISOString(),
          },
        });
      }

      return { previousData };
    },

    onSuccess: () => {
      toast({ variant: "success", title: "Your event has been published." });
    },

    onError: (_err, _variables, context) => {
      toast({
        variant: "destructive",
        title: "Failed to publish.",
      });
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileEvents() });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: (reason?: string) => cancelEvent(eventID, reason),

    onMutate: async (cancelledReason) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<EventReponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<EventReponse>(queryKey, {
          ...previousData,
          data: {
            ...previousData.data,
            status: EVENT_STATUS.CANCELLED,
            cancelledReason: cancelledReason || "No reason provided",
          },
        });
      }

      return { previousData };
    },

    onSuccess: () => {
      toast({ variant: "success", title: "Cancelled successfully." });
    },

    onError: (_err, _reason, context) => {
      toast({ variant: "destructive", title: "Failed to cancel." });
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileEvents() });
    },
  });

  return {
    eventQuery,
    updateEvent: updateEventMutation.mutateAsync,
    isUpdating: updateEventMutation.isPending,
    cancelEvent: cancelEventMutation.mutateAsync,
    isCancelling: cancelEventMutation.isPending,
    publishEvent: publishEventMutation.mutateAsync,
    isPublishing: publishEventMutation.isPending,
  };
}
