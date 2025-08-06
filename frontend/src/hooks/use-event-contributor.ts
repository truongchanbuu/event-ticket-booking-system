import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContributorAPI,
  removeContributor as removeContributorAPI,
  updateContributorAPI,
} from "@/lib/api/events/api";
import { QUERY_KEYS } from "@/constants/event";
import { EventContributor } from "@/schema";
import { toast } from "./use-toast";

interface RemoveContributorArgs {
  eventID: string;
  contributorID: string;
}

interface CreateContributorArgs {
  eventID: string;
  data: EventContributor;
}

interface updateContributorArgs {
  eventID: string;
  contributorID: string;
  data: Partial<EventContributor>;
}

export function useEventContributor() {
  const queryClient = useQueryClient();

  const { mutateAsync: removeContributor, isPending: isRemoving } = useMutation(
    {
      mutationFn: async ({ eventID, contributorID }: RemoveContributorArgs) =>
        await removeContributorAPI(eventID, contributorID),

      onSuccess: (_data, variables) => {
        toast({ variant: "success", title: "Contributor has been removed." });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventDetail(variables.eventID),
        });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventContributors(variables.eventID),
        });
      },

      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(message);
        toast({ variant: "destructive", title: "Failed to delete." });
      },
    }
  );

  const { mutateAsync: createContributor, isPending: isCreating } = useMutation(
    {
      mutationFn: async ({ eventID, data }: CreateContributorArgs) =>
        await createContributorAPI(eventID, data),

      onSuccess: (_data, variables) => {
        toast({ variant: "success", title: "Contributor has been created." });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventDetail(variables.eventID),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventContributors(variables.eventID),
        });
      },

      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(message);
        toast({ variant: "destructive", title: "Failed to create." });
      },
    }
  );

  const { mutateAsync: updateContributor, isPending: isUpdating } = useMutation(
    {
      mutationFn: async ({
        eventID,
        contributorID,
        data,
      }: updateContributorArgs) =>
        await updateContributorAPI(eventID, contributorID, data),

      onSuccess: (_data, variables) => {
        toast({ variant: "success", title: "Contributor has been updated." });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventDetail(variables.eventID),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventContributors(variables.eventID),
        });
      },

      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(message);
        toast({ variant: "destructive", title: "Failed to update." });
      },
    }
  );

  return {
    removeContributor,
    isRemoving,
    createContributor,
    isCreating,
    updateContributor,
    isUpdating,
  };
}
