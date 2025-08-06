import { QUERY_KEYS } from "@/constants/event";
import {
  AttendeesResponse,
  createAttendee,
  CRUDAttendeeResponse,
  getAttendees,
} from "@/lib/api/events/api";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "./use-toast";

export function useEventAttendees(eventID: string, params?) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.eventAttendees(eventID, params);

  const attendeesQuery = useInfiniteQuery<AttendeesResponse>({
    queryKey,
    queryFn: ({ pageParam }) =>
      getAttendees(eventID, { ...params, startAfter: pageParam }),

    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.hasMore
        ? lastPage.metadata.nextCursor
        : undefined;
    },

    initialPageParam: undefined,
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(eventID),
  });

  const createAttendeeMutation = useMutation<CRUDAttendeeResponse>({
    mutationFn: (data) => createAttendee(eventID, data),
    onSuccess: () => {
      toast({ variant: "success", title: "Attendee created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["attendees", eventID] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: error.message || "Failed to create attendee.",
      });
      console.error("Mutation Error:", error);
    },
  });

  return { attendeesQuery, createAttendee: createAttendeeMutation.mutateAsync };
}
