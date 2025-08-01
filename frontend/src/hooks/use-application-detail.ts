import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import {
  fetchApplicationById,
  approveApplication,
  rejectApplication,
  lockApplication,
  revertApplicationToPending,
} from "@/lib/api/application/api";
import { ApplicationReponse } from "@/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export const useApplicationDetail = (appId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<ApplicationReponse>({
    queryKey: APPLICATION_QUERY_KEYS.applicationDetail(appId),
    queryFn: () => fetchApplicationById(appId),
    enabled: Boolean(appId),
  });

  const onMutationSuccess = (toastTitle: string, data) => {
    console.log("Data: ", data);
    toast({ variant: "success", title: toastTitle });
    queryClient.invalidateQueries({
      queryKey: APPLICATION_QUERY_KEYS.applicationDetail(appId),
    });

    queryClient.invalidateQueries({
      queryKey: APPLICATION_QUERY_KEYS.adminApplications(),
    });
  };

  // ✅ Approve
  const approve = useMutation({
    mutationFn: () => approveApplication(appId, "admin"),
    onSuccess: (data) => onMutationSuccess("Approved successfully", data),
    onError: () =>
      toast({ title: "Failed to approve", variant: "destructive" }),
  });

  // ❌ Reject
  const reject = useMutation({
    mutationFn: ({ rejectionReason }: { rejectionReason: string }) =>
      rejectApplication(appId, rejectionReason, "admin", false),
    onSuccess: (data) => onMutationSuccess("Rejected successfully", data),
    onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
  });

  // 🔒 Permanent Reject
  const permanentReject = useMutation({
    mutationFn: ({ rejectionReason }: { rejectionReason: string }) =>
      rejectApplication(appId, rejectionReason, "admin", true),
    onSuccess: (data) => onMutationSuccess("Permanently rejected", data),
    onError: () =>
      toast({ title: "Failed to permanently reject", variant: "destructive" }),
  });

  // ... Các mutations khác cũng gọi `onMutationSuccess` tương tự ...

  // 🔐 Lock
  const lock = useMutation({
    mutationFn: () => lockApplication(appId, "admin"),
    onSuccess: (data) => onMutationSuccess("Locked successfully", data),
    onError: () => toast({ title: "Failed to lock", variant: "destructive" }),
  });

  // ↩️ Revert to Pending
  const revertToPending = useMutation({
    mutationFn: () => revertApplicationToPending(appId),
    onSuccess: (data) => onMutationSuccess("Reverted to pending", data),
    onError: () => toast({ title: "Failed to revert", variant: "destructive" }),
  });

  return {
    query,
    approve,
    reject,
    permanentReject,
    lock,
    revertToPending,
  };
};
