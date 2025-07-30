import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchApplicationById,
  getLastApplication,
  setEditingApplication,
} from "@/lib/api/application/api";
import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import { Application } from "@/schema";
import { useToast } from "./use-toast";
import { useEffect } from "react";

export function useUserApplication(userID?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = APPLICATION_QUERY_KEYS.userApplication(userID);

  const applicationQuery = useQuery<{ sucess: boolean; data: Application[] }>({
    queryKey: queryKey,
    queryFn: getLastApplication,
    enabled: Boolean(userID),
  });

  const setEditting = useMutation({
    mutationFn: setEditingApplication,
    onSuccess: () => {
      toast({ variant: "success", title: "Set to Edit" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Cannot change to editing status",
      });
    },
  });

  return { applicationQuery, setEditting };
}
