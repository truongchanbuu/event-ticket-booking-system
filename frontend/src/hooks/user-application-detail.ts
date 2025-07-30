import { useQuery } from "@tanstack/react-query";
import { fetchApplicationById } from "@/lib/api/application/api";
import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import { Application } from "@/schema";

export function useApplicationDetail(appId: string) {
  return useQuery<{ sucess: boolean; data: Application }>({
    queryKey: APPLICATION_QUERY_KEYS.applicationDetail(appId),
    queryFn: () => fetchApplicationById(appId),
    enabled: Boolean(appId),
  });
}
