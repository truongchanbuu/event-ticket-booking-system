"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EventCard from "@/components/event/event-card";
import EventFilterBar from "@/components/event/event-filter-bar";
import EventLoadingSkeleton from "@/components/event/event-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventType, Organizer, EventFilters } from "@/schema";
import { mockEvents } from "@/schema/events/events.mock";
import { mockOrganizers } from "@/schema/user/organizer.mock";
import { useDebounce } from "@/hooks/use-debounce";

const MAX_SUGGEST_ORGANIZER = 6;
const DEBOUNCE_DELAY = 300;

export default function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Pagination states
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { data: organizers = [] } = useQuery<Organizer[]>({
    queryKey: ["/api/organizers"],
    queryFn: () => Promise.resolve(mockOrganizers),
  });

  const suggestedOrganizers = organizers.slice(0, MAX_SUGGEST_ORGANIZER);

  // Debounced filter change using custom hook
  const debouncedSetFilters = useDebounce(setFilters, DEBOUNCE_DELAY);

  // Fetch events with pagination
  const fetchEvents = async (
    pageNum: number,
    currentFilters: EventFilters,
    append = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Giả lập API: mockEvents.slice theo page
      await new Promise((resolve) => setTimeout(resolve, 500));
      const pageSize = 6;

      // Lọc theo filter
      let filtered = mockEvents;

      // Filter by categories
      if (currentFilters.categories && currentFilters.categories.length > 0) {
        filtered = filtered.filter((event) =>
          event.categories.some((category) =>
            currentFilters.categories!.includes(category.id)
          )
        );
      }

      // Filter by search
      if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filtered = filtered.filter(
          (event) =>
            event.eventTitle.toLowerCase().includes(searchTerm) ||
            event.eventDesc.toLowerCase().includes(searchTerm) ||
            event.location.toLowerCase().includes(searchTerm) ||
            event.organizerName.toLowerCase().includes(searchTerm)
        );
      }

      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;
      const data = filtered.slice(start, end);
      const more = end < filtered.length;
      setEvents((prev) => (append ? [...prev, ...data] : data));
      setHasMore(more);
      setPage(pageNum);
    } catch (err) {
      setError("Failed to load events.");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Load đầu tiên và khi đổi filter
  useEffect(() => {
    setEvents([]);
    setPage(1);
    setHasMore(true);
    fetchEvents(1, filters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Loading skeleton chỉ hiển thị khi initial load
  if (isInitialLoad && loading) {
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

        {/* Filter Bar Skeleton */}
        <div className="shadow-sm border border-gray-200 rounded-lg p-6">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>

        {/* Events Grid Skeleton */}
        <EventLoadingSkeleton count={6} viewMode={viewMode} />
      </div>
    );
  }

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

      {/* Search and Filters */}
      <EventFilterBar
        filters={filters}
        onFiltersChange={debouncedSetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Events Grid */}
      <div
        className={`grid gap-6 ${
          viewMode === "grid"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        }`}
      >
        {events.length === 0 && !loading ? (
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
            {events.map((event) => (
              <EventCard
                key={event.eventID}
                event={event}
                organizerName={event.organizerName}
                organizerPhotoUrl={event.organizerPhotoUrl}
              />
            ))}
            {/* Loading skeletons for additional items when loading more */}
            {loading && !isInitialLoad && (
              <EventLoadingSkeleton count={3} viewMode={viewMode} />
            )}
          </>
        )}
      </div>

      {/* Load More Button */}
      {events.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fetchEvents(page + 1, filters, true)}
            disabled={loading || !hasMore}
          >
            {loading
              ? "Loading..."
              : hasMore
                ? "Load more event"
                : "No more event available"}
          </Button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
      )}

      {/* Suggested Organizers Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Suggested Organizers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedOrganizers.map((organizer) => (
              <div
                key={organizer.organizerId}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={organizer.photoUrl} />
                  <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {organizer.name}
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
                  /* TODO: chuyển hướng sang trang organizers hoặc callback */
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
