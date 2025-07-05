"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  Share2,
  FileText,
} from "lucide-react";
import TicketSelector from "@/components/ticket/ticket-selector";
import EventCategories from "@/components/event/event-categories";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EventType, Organizer, MinimizedTicketType } from "@/schema";
import { mockEvent } from "@/schema/events/events.mock";
import { mockOrganizer } from "@/schema/user/organizer.mock";
import EventThumbnail from "@/components/event/event-thumb";
import { formatDate, formatTime } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedTickets, setSelectedTickets] = useState<{
    [key: string]: number;
  }>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useQuery<EventType>({
    queryKey: [`/api/events/${id}`],
    enabled: Boolean(id),
    queryFn: () => Promise.resolve(mockEvent),
    placeholderData: mockEvent,
  });

  const { data: organizer } = useQuery<Organizer>({
    queryKey: [`/api/organizers/${event?.organizerID}`],
    enabled: Boolean(event?.organizerID),
    queryFn: async () => await Promise.resolve(mockOrganizer),
  });

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking successful!",
        description: "Check your email for confirmation.",
        variant: "success",
      });
      setSelectedTickets({});
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: () => {
      toast({
        title: "Booking failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const followMutation = useMutation({
    mutationFn: async (action: "follow" | "unfollow") => {
      const method = action === "follow" ? "POST" : "DELETE";
      const response = await apiRequest(
        method,
        `/api/users/1/follow/${organizer?.organizerId}`
      );
      return response.json();
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing
          ? "Unfollowed successfully!"
          : "Now following organizer!",
        variant: "info",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const handleShareEvent = () => {
    const textToCopy = window.location.href;
    if (!navigator.clipboard) {
      toast({
        title: "Clipboard not supported",
        description: "Your browser does not support clipboard copy.",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "You can now share this with your friends.",
          variant: "info",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Please try again manually.",
          variant: "destructive",
        });
      });
  };

  if (eventLoading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-64 md:h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];

  const handleTicketChange = (ticketId: string, quantity: number) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [ticketId]: quantity,
    }));
  };

  const handleBookNow = async () => {
    const bookings = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => {
        const ticketType = ticketTypes.find((t) => t.typeID === ticketId);
        return {
          userId: 1, // Demo user ID
          eventId: event.eventID,
          ticketType: ticketType?.name || ticketId,
          quantity,
          totalAmount: (ticketType?.price || 0) * quantity,
        };
      });

    if (bookings.length === 0) {
      toast({
        title: "No tickets selected",
        description: "Please select at least one ticket.",
        variant: "destructive",
      });
      return;
    }

    for (const booking of bookings) {
      await bookingMutation.mutateAsync(booking);
    }
  };

  const handleFollow = () => {
    followMutation.mutate(isFollowing ? "unfollow" : "follow");
  };

  // Helper function to truncate description
  const truncateDescription = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/events">
            <Button
              variant="ghost"
              size="sm"
              className="text-lg hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>

          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              className="hover:shadow-md transition-all duration-200"
              onClick={handleShareEvent}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Hero Section with Enhanced Image */}
        <div className="relative mb-12">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <EventThumbnail
              thumbnails={event.thumbnails}
              eventName={event.eventTitle}
              eventDesc={event.eventDesc}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Event Title Overlay */}
            <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
              <h1 className="text-xl md:text-xl lg:text-xl font-bold text-white mb-2 drop-shadow-lg">
                {event.eventTitle}
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Info (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <EventCategories
                      categories={event.categories}
                      variant="compact"
                      showAll={true}
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 flex-shrink-0 ml-4">
                    <Users className="h-4 w-4" />
                    <span>120 attending</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                      <div className="p-3 bg-blue-500 rounded-full">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Date
                        </p>
                        <p className="text-md font-normal text-blue-900">
                          {formatDate(event.startTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-800">
                          Time
                        </p>
                        <p className="text-md font-normal text-purple-900">
                          {formatTime(event.startTime)}
                          {event.endTime && ` - ${formatTime(event.endTime)}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Location
                        </p>
                        <p className="text-md font-normal text-green-900">
                          {event.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl">
                      <div className="p-3 bg-yellow-500 rounded-full">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Rating
                        </p>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                          <span className="text-sm text-yellow-700 ml-1">
                            (4.8)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Description Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 pb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-800">
                    About This Event
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="prose prose-gray max-w-none">
                  <div className="text-gray-700 leading-relaxed text-md">
                    {isDescriptionExpanded ? (
                      <div className="whitespace-pre-wrap">
                        {event.eventDesc}
                      </div>
                    ) : (
                      <div>{truncateDescription(event.eventDesc)}</div>
                    )}
                  </div>

                  {event.eventDesc && event.eventDesc.length > 300 && (
                    <div className="mt-6">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setIsDescriptionExpanded(!isDescriptionExpanded)
                        }
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold transition-all duration-200"
                      >
                        {isDescriptionExpanded ? "Show Less" : "Read More"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Organizer Card */}
            {organizer && (
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <CardTitle className="text-xl font-bold text-gray-800">
                    Meet the Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16 ring-4 ring-blue-100">
                        <AvatarImage src={organizer.photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-bold">
                          {organizer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/organizers/${organizer.organizerId}`}>
                          <p className="text-md font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors duration-200">
                            {organizer.name}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-600 font-medium">
                          {organizer.eventsCount} events organized
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">(4.9)</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      onClick={handleFollow}
                      disabled={followMutation.isPending}
                      className={`px-8 py-3 font-semibold transition-all duration-200 ${
                        isFollowing
                          ? "hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {followMutation.isPending
                        ? "..."
                        : isFollowing
                          ? "Unfollow"
                          : "Follow"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sticky Ticket Booking */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Book Your Tickets
                </h3>
                <p className="text-blue-100">
                  Secure your spot at this amazing event!
                </p>
              </div>
              <div className="p-6">
                <TicketSelector
                  ticketTypes={ticketTypes}
                  selectedTickets={selectedTickets}
                  onTicketChange={handleTicketChange}
                  onBookNow={handleBookNow}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
