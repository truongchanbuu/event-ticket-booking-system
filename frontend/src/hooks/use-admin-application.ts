import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllApplications } from "@/lib/api/application/api";
import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import { useEffect } from "react";
import { Application } from "@/schema";

export function useAdminApplication(params?: {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const queryKey = APPLICATION_QUERY_KEYS.adminApplications(params);

  // 📥 Fetch all applications
  const applicationsQuery = useInfiniteQuery({
    queryKey,
    queryFn: fetchAllApplications,
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.lastVisibleValue : undefined,
  });

  // 🔄 Update local cache for each application
  useEffect(() => {
    if (applicationsQuery.data) {
      applicationsQuery.data.pages.forEach((page) => {
        page.data.forEach((app: Application) => {
          queryClient.setQueryData(
            APPLICATION_QUERY_KEYS.applicationDetail(app.applicationID),
            app
          );
        });
      });
    }
  }, [applicationsQuery.data, queryClient]);

  return {
    applicationsQuery,
  };
}
