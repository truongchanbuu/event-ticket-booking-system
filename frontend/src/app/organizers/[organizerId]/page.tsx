"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, Calendar, Loader2 } from "lucide-react";
import EventCard from "@/components/events/event-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Organizer, EventType, Category } from "@/schema";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const EVENTS_PER_PAGE = 5;

export default function OrganizerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  const [displayedEventsCount, setDisplayedEventsCount] =
    useState(EVENTS_PER_PAGE);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organizer, isLoading: organizerLoading } = useQuery<Organizer>({
    queryKey: [`/api/organizers/${id}`],
    enabled: !!id,
  });

  const { data: events = [] } = useQuery<EventType[]>({
    queryKey: [`/api/organizers/${id}/events`],
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const followMutation = useMutation({
    mutationFn: async (action: "follow" | "unfollow") => {
      const method = action === "follow" ? "POST" : "DELETE";
      const response = await apiRequest(method, `/api/users/1/follow/${id}`);
      return response.json();
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing
          ? "Unfollowed successfully!"
          : "Now following organizer!",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/organizers/${id}`] });
    },
    onError: () => {
      toast({
        title: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const upcomingEvents = events.filter(
    (event) => event.startTime.toDate() >= new Date()
  );
  const pastEvents = events.filter(
    (event) => event.endTime.toDate() < new Date()
  );

  // Get displayed events (first 10 or more based on load more)
  const displayedEvents = events.slice(0, displayedEventsCount);
  const hasMoreEvents = events.length > displayedEventsCount;

  // Debug: Log events count and organizer ID
  console.log("Organizer ID:", id);
  console.log("Events count:", events.length);
  console.log("Displayed events count:", displayedEventsCount);
  console.log("Has more events:", hasMoreEvents);

  const handleFollow = () => {
    followMutation.mutate(isFollowing ? "unfollow" : "follow");
  };

  const handleLoadMore = () => {
    setDisplayedEventsCount((prev) => prev + EVENTS_PER_PAGE);
  };

  if (organizerLoading || !organizer) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
          <div className="col-span-2 h-80 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="flex items-center space-x-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>

      {/* Organizer Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organizer Info */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={organizer.photoUrl} />
                <AvatarFallback className="text-2xl">
                  {organizer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {organizer.name}
              </h1>
              <p className="text-gray-600 mb-4">{organizer.bio}</p>

              <div className="grid grid-cols-2 gap-4 text-center mb-6">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {organizer.eventsCount}
                  </p>
                  <p className="text-sm text-gray-600">Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {organizer.followersCount}
                  </p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
              </div>

              <Button
                onClick={handleFollow}
                variant={isFollowing ? "outline" : "default"}
                disabled={followMutation.isPending}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Overview */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Event Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {upcomingEvents.length}
                  </p>
                  <p className="text-sm text-gray-600">Upcoming Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {pastEvents.length}
                  </p>
                  <p className="text-sm text-gray-600">Past Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No events found.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.slice(0, 4).map((event) => (
                    <div key={event.eventID} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          {event.categories[0]?.name || "General"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(event.startTime)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {event.eventTitle}
                      </h3>
                      <p className="text-sm text-gray-600">{event.location}</p>
                      <Link href={`/events/${event.eventID}`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All Events */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            All Events ({events.length})
          </h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Upcoming ({upcomingEvents.length})
            </Button>
            <Button variant="outline" size="sm">
              Past ({pastEvents.length})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">
                This organizer hasn't created any events yet.
              </p>
            </div>
          ) : (
            displayedEvents.map((event) => (
              <EventCard
                key={event.eventID}
                event={event}
                organizerName={organizer.name}
                organizerPhotoUrl={organizer.photoUrl}
              />
            ))
          )}
        </div>

        {/* Load More Button */}
        {hasMoreEvents && (
          <div className="text-center pt-6">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
              className="px-8"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Load More Events
              <span className="ml-2 text-sm text-gray-500">
                ({events.length - displayedEventsCount} remaining)
              </span>
            </Button>
          </div>
        )}

        {/* Show when all events are loaded */}
        {!hasMoreEvents && events.length > 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500">
              All {events.length} events have been loaded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
