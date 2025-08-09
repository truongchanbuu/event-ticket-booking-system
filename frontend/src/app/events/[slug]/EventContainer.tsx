"use client";

import { EventDetail } from "@/schema";
import { AvailabilityClient } from "./AvailabilityClient";
import EventThumbnail from "@/components/events/event-thumb";
import EventCategories from "@/components/events/event-categories";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import { formatEventTime } from "@/lib/utils";
import { EventDescription } from "@/components/events/description";

interface EventContainerProps {
  event: EventDetail;
}

export function EventContainer({ event }: EventContainerProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        {/* Left Column - Event Details */}
        <div className="space-y-6">
          {/* Hero Image */}
          <EventThumbnail
            thumbnails={event.images}
            eventDesc={event.description}
            eventName={event.title}
          />

          {/* Event Info */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <EventCategories categories={event.categories} />
              {event.isFeatured && <Badge variant="default">Feature</Badge>}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {event.title}
            </h1>

            <div className="flex items-start gap-4 text-gray-600">
              <CalendarDays className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {formatEventTime(event.startTime, event.endTime)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-gray-600">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p>{event.location?.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Organized By: {event.organizer?.name}</span>
              <span>•</span>
              <span>{event.stats?.participantCount ?? 0} participants</span>
            </div>
          </div>

          {/* Description */}
          <EventDescription description={event.description} />
        </div>

        {/* Right Column - Availability */}
        <div className="md:sticky md:top-8">
          <AvailabilityClient
            eventId={event.eventID || event.slug}
            slug={event.slug}
            totalCapacity={event.stats?.totalTickets ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
