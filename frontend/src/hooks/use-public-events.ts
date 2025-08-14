import { EventsResponse, getPublishedEvents } from "@/lib/api/events/api";
import { GetParams } from "@/schema/api";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";

export type PublicEventsInfiniteResult = UseInfiniteQueryResult<
  InfiniteData<EventsResponse, string | null>,
  Error
>;

export function usePublicEvents(
  options?: Omit<GetParams, "cursor">
): UseInfiniteQueryResult<InfiniteData<EventsResponse, string | null>, Error> {
  return useInfiniteQuery<
    EventsResponse,
    Error,
    InfiniteData<EventsResponse, string | null>,
    readonly ["public-events", Omit<GetParams, "cursor"> | undefined],
    string | null
  >({
    queryKey: ["public-events", options] as const,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getPublishedEvents({ ...options, cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.metadata?.nextCursor ?? undefined,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFlatPublicEvents(options?: Omit<GetParams, "cursor">) {
  const q = usePublicEvents(options);

  // Mỗi phần tử trong pages chính là EventsResponse (APIResponse<PublicEvent[]>)
  const events = q.data?.pages.flatMap((page) => page.data) ?? [];

  const hasMore = q.data?.pages.at(-1)?.metadata?.hasMore ?? false;

  return {
    ...q,
    events,
    hasMore,
    loadMore: () => q.fetchNextPage(),
    isLoadingMore: q.isFetchingNextPage,
  };
}
