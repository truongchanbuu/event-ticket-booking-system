"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EventFilterBar from "@/components/events/event-filter-bar";
import EventLoadingSkeleton from "@/components/events/event-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, EventFilters } from "@/schema";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { AppUser } from "@/schema/user";
import { usePublicEvents } from "@/hooks/use-public-events";
import { PublicEventCard } from "@/components/events/public-event-card";

const MAX_SUGGEST_ORGANIZER = 6;
const DEBOUNCE_DELAY = 300;

export default function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce filter changes để đỡ re-render
  const debouncedSetFilters = useDebounceCallback(setFilters, DEBOUNCE_DELAY);

  // ---- ORGANIZERS (mock) ----
  const { data: organizers = [] } = useQuery<AppUser[]>({
    queryKey: ["/api/organizers"],
    queryFn: () => Promise.resolve([]),
  });
  const suggestedOrganizers = organizers.slice(0, MAX_SUGGEST_ORGANIZER);

  // ---- EVENTS (infinite) ----
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = usePublicEvents({
    limit: 9,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const pages = data?.pages ?? [];

  const extractEvents = (p: any): Event[] =>
    p?.data?.events ?? p?.data?.data?.events ?? p?.events ?? [];

  const allEvents: Event[] = useMemo(() => {
    return (pages ?? []).flatMap(extractEvents);
  }, [pages]);

  const filteredEvents = useMemo(() => {
    let output = allEvents;

    if (filters.categories && filters.categories.length > 0) {
      output = output.filter((ev) => {
        const catIds = Array.isArray(ev.categories)
          ? ev.categories.map((c: any) => (typeof c === "string" ? c : c.id))
          : [];
        return filters.categories!.some((id) => catIds.includes(id));
      });
    }

    // filter by search (match vài field cơ bản)
    if (filters.search) {
      const term = filters.search.toLowerCase();
      output = output.filter((ev: any) => {
        const title = (ev.eventTitle ?? ev.title ?? "").toLowerCase();
        const desc = (ev.eventDesc ?? ev.description ?? "").toLowerCase();
        const loc = (ev.location?.address ?? "").toLowerCase();
        const org = (ev.organizer?.name ?? "").toLowerCase();
        return (
          title.includes(term) ||
          desc.includes(term) ||
          loc.includes(term) ||
          org.includes(term)
        );
      });
    }

    return output;
  }, [allEvents, filters]);

  // Trạng thái
  const loadMoreDisabled = !hasNextPage || isFetchingNextPage;
  const showInitialSkeleton = isLoading && !pages?.length;

  return (
    <div className="space-y-5 px-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Events
          </h1>
          <p className="text-gray-600">
            Find and book amazing events happening around you
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div>
        <EventFilterBar
          filters={filters}
          onFiltersChange={debouncedSetFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Initial skeleton */}
      {showInitialSkeleton && (
        <>
          {/* Filter Bar Skeleton */}
          <div className="shadow-sm border border-gray-200 rounded-lg p-6">
            <Skeleton className="h-10 w-full mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>

          <EventLoadingSkeleton count={9} viewMode={viewMode} />
        </>
      )}

      {/* Events Grid */}
      {!showInitialSkeleton && (
        <div
          className={`grid gap-6 ${
            viewMode === "grid"
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {filteredEvents.length === 0 && !isLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">
                No events found matching your criteria.
              </p>
              <Button
                onClick={() => setFilters({})}
                variant="outline"
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {filteredEvents.map((event) => (
                <PublicEventCard key={event.eventID} event={event} />
              ))}

              {/* Loading skeletons khi load thêm page */}
              {isFetchingNextPage && (
                <EventLoadingSkeleton count={3} viewMode={viewMode} />
              )}
            </>
          )}
        </div>
      )}

      {/* Load More */}
      {filteredEvents.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fetchNextPage()}
            disabled={loadMoreDisabled}
          >
            {isFetchingNextPage
              ? "Loading..."
              : hasNextPage
                ? "Load more event"
                : "No more event available"}
          </Button>
          {error && (
            <div className="text-red-500 mt-2">
              {(error as Error).message ?? "Failed to load events."}
            </div>
          )}
        </div>
      )}

      {/* Suggested Organizers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Suggested Organizers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedOrganizers.map((organizer) => (
              <div
                key={organizer.userID}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={organizer.photoUrl} />
                  <AvatarFallback>
                    {organizer.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {organizer.username}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {organizer.followersCount} followers
                  </p>
                  <p className="text-sm text-gray-600">
                    {organizer.eventsCount} events organized
                  </p>
                </div>
                <Button size="sm">Follow</Button>
              </div>
            ))}
          </div>
          {organizers.length > MAX_SUGGEST_ORGANIZER && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => {
                  /* TODO: chuyển hướng sang trang organizers */
                }}
                className="w-full sm:w-auto"
              >
                Explore more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
