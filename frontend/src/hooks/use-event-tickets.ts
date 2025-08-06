import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/event";
import {
  createTicketType,
  deleteTicketType,
  getEventTicketTypes,
  TicketTypesResponse,
  updateTicketType,
} from "@/lib/api/ticket/api";
import { toast } from "./use-toast";
import { TicketFormData } from "@/schema";

export function useEventTicketTypes(eventID: string) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.eventTicketTypes(eventID);

  const ticketTypesQuery = useQuery<TicketTypesResponse>({
    queryKey,
    queryFn: () => getEventTicketTypes(eventID),
    enabled: Boolean(eventID),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const createTicketTypeMutation = useMutation({
    mutationFn: (ticketType) => createTicketType(ticketType),
    onSuccess: () => {
      toast({ variant: "success", title: "Create successfully!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Created failed!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateTicketTypeMutation = useMutation({
    mutationFn: ({
      ticketTypeID,
      ticketType,
    }: {
      ticketTypeID: string;
      ticketType: TicketFormData;
    }) => updateTicketType(ticketTypeID, ticketType),
    onSuccess: (data) => {
      toast({ variant: "success", title: "Updated successfully!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Updated failed!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteTicketTypeMutation = useMutation({
    mutationFn: (ticketTypeID: string) => deleteTicketType(ticketTypeID),
    onSuccess: (data) => {
      toast({ variant: "success", title: "Delete successfully!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: `Delete failed!` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ticketTypesQuery,
    createTicketType: createTicketTypeMutation.mutateAsync,
    isCreating: createTicketTypeMutation.isPending,
    updateTicketType: updateTicketTypeMutation.mutateAsync,
    isUpdating: updateTicketTypeMutation.isPending,
    deleteTicketType: deleteTicketTypeMutation.mutateAsync,
    isDeleting: deleteTicketTypeMutation.isPending,
  };
}
