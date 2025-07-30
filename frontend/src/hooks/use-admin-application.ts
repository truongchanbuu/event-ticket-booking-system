import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllApplications,
  approveApplication,
  rejectApplication,
  permanentRejectApplication,
  markApplicationProcessing,
} from "@/lib/api/application/api";
import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import { useToast } from "./use-toast";
import { ApplicationsApiResponse } from "@/schema";
import { useEffect } from "react";

export function useAdminApplication(params?: {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = APPLICATION_QUERY_KEYS.adminApplications(params);

  // 📥 Fetch all applications
  const applicationsQuery = useQuery<ApplicationsApiResponse>({
    queryKey: queryKey,
    queryFn: () => fetchAllApplications(params),
  });

  useEffect(() => {
    if (applicationsQuery.isSuccess) {
      toast({ variant: "success", title: "Loaded application" });

      const result = applicationsQuery.data;
      result.data.forEach((app) => {
        queryClient.setQueryData(
          APPLICATION_QUERY_KEYS.applicationDetail(app.applicationID),
          app
        );
      });
    }
  }, [applicationsQuery.isSuccess]);

  // ✅ Approve
  const approve = useMutation({
    mutationFn: approveApplication,
    onSuccess: () => {
      toast({ variant: "success", title: "Application approved" });
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: () =>
      toast({ title: "Failed to approve", variant: "destructive" }),
  });

  // ❌ Reject
  const reject = useMutation({
    mutationFn: rejectApplication,
    onSuccess: () => {
      toast({ variant: "warning", title: "Application rejected" });
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
  });

  // 🔒 Permanent Reject
  const permanentReject = useMutation({
    mutationFn: permanentRejectApplication,
    onSuccess: () => {
      toast({ title: "Application permanently rejected" });
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: () =>
      toast({ title: "Failed to permanently reject", variant: "destructive" }),
  });

  // ⚙️ Mark Processing
  const markProcessing = useMutation({
    mutationFn: markApplicationProcessing,
    onSuccess: () => {
      toast({ title: "Application marked as processing" });
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: () =>
      toast({ title: "Failed to mark processing", variant: "destructive" }),
  });

  return {
    applicationsQuery,
    approve,
    reject,
    permanentReject,
    markProcessing,
  };
}
