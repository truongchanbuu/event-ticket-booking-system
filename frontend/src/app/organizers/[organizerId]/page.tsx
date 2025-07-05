"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  Clock,
  Star,
  Share2,
  Heart,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  ExternalLink,
  Mail,
  Globe,
  Phone,
  LucideFacebook,
  Instagram,
  Twitter,
} from "lucide-react";
import EventCard from "@/components/event/event-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Organizer, EventType, Category } from "@/schema";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { mockOrganizer } from "@/schema/user/organizer.mock";
import { mockEvents } from "@/schema/events/events.mock";

export default function OrganizerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "title" | "popularity">("date");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organizer, isLoading: organizerLoading } = useQuery<Organizer>({
    queryKey: [`/api/organizers/${id}`],
    enabled: Boolean(id),
    placeholderData: mockOrganizer,
  });

  const { data: events = [] } = useQuery<EventType[]>({
    queryKey: [`/api/organizers/${id}/events`],
    enabled: Boolean(id),
    placeholderData: mockEvents,
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

  const handleFollow = () => {
    followMutation.mutate(isFollowing ? "unfollow" : "follow");
  };

  const getFilteredEvents = () => {
    let filteredEvents = events;

    if (activeTab === "upcoming") {
      filteredEvents = upcomingEvents;
    } else if (activeTab === "past") {
      filteredEvents = pastEvents;
    }

    // Sort events
    return filteredEvents.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
          );
        case "title":
          return a.eventTitle.localeCompare(b.eventTitle);
        case "popularity":
          return (b.participantCount || 0) - (a.participantCount || 0);
        default:
          return 0;
      }
    });
  };

  if (organizerLoading || !organizer) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </div>

        {/* Hero Section Skeleton */}
        <div className="relative h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="h-80 bg-gray-200 rounded-xl"></div>
          <div className="col-span-3 h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-end space-x-6">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarImage src={organizer.photoUrl} />
                <AvatarFallback className="text-2xl bg-white text-gray-900">
                  {organizer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-2 truncate">
                  {organizer.name}
                </h1>
                <p className="text-blue-100 text-lg line-clamp-2">
                  {organizer.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-15">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {organizer.eventsCount}
                  </p>
                  <p className="text-sm text-gray-600">Events</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
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
                className="w-full mb-4"
              >
                <Heart
                  className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`}
                />
                {isFollowing ? "Following" : "Follow"}
              </Button>

              {/* Quick Stats */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Upcoming Events</span>
                  <Badge variant="secondary">{upcomingEvents.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Past Events</span>
                  <Badge variant="outline">{pastEvents.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average Rating</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="ml-1 font-medium">4.8</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {organizer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a
                    href={`mailto:${organizer.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {organizer.email}
                  </a>
                </div>
              )}
              {organizer.websiteUrl && (
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={organizer.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              {organizer.facebookUrl && (
                <div className="flex items-center space-x-3">
                  <LucideFacebook className="h-4 w-4 text-gray-400" />
                  <a
                    href={organizer.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              {organizer.instagramUrl && (
                <div className="flex items-center space-x-3">
                  <Instagram className="h-4 w-4 text-gray-400" />
                  <a
                    href={organizer.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              {organizer.xUrl && (
                <div className="flex items-center space-x-3">
                  <Twitter className="h-4 w-4 text-gray-400" />
                  <a
                    href={organizer.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              {organizer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a
                    href={`tel:${organizer.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {organizer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-3 space-y-6">
          {/* Featured Events */}
          {upcomingEvents.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Featured Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.eventID}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">
                          {event.categories[0].name}
                        </Badge>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(event.startTime)}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {event.eventTitle}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {event.participantCount || 0} attending
                          </span>
                        </div>
                        <Link href={`/events/${event.eventID}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            View Details
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Events Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Events</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                  >
                    {viewMode === "grid" ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <Grid3X3 className="h-4 w-4" />
                    )}
                  </Button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="popularity">Sort by Popularity</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    All Events ({events.length})
                  </TabsTrigger>
                  <TabsTrigger value="upcoming">
                    Upcoming ({upcomingEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="past">
                    Past ({pastEvents.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <EventsGrid
                    events={getFilteredEvents()}
                    viewMode={viewMode}
                    organizerName={organizer.name}
                    organizerPhotoUrl={organizer.photoUrl}
                  />
                </TabsContent>

                <TabsContent value="upcoming" className="mt-6">
                  <EventsGrid
                    events={getFilteredEvents()}
                    viewMode={viewMode}
                    organizerName={organizer.name}
                    organizerPhotoUrl={organizer.photoUrl}
                  />
                </TabsContent>

                <TabsContent value="past" className="mt-6">
                  <EventsGrid
                    events={getFilteredEvents()}
                    viewMode={viewMode}
                    organizerName={organizer.name}
                    organizerPhotoUrl={organizer.photoUrl}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper component for rendering events
function EventsGrid({
  events,
  viewMode,
  organizerName,
  organizerPhotoUrl,
}: {
  events: EventType[];
  viewMode: "grid" | "list";
  organizerName: string;
  organizerPhotoUrl: string;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No events found.</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.eventID}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {event.categories[0].name}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(event.startTime)}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {event.eventTitle}
                </h3>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  {event.location}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {event.attendeeCount || 0}
                  </span>
                </div>
                <Link href={`/events/${event.eventID}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.eventID}
          event={event}
          organizerName={organizerName}
          organizerPhotoUrl={organizerPhotoUrl}
        />
      ))}
    </div>
  );
}
