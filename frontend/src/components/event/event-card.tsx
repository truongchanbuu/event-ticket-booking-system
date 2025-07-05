import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin } from "lucide-react";
import { getStatusColor, formatDateTime, formatCurrency } from "@/lib/utils";
import type { EventType } from "@/schema/index";
import Link from "next/link";
import EventThumbnail from "./event-thumb";
import EventCategories from "./event-categories";
import EVENT_STATUS from "@/schema/enums/enum-status";

interface EventCardProps {
  event: EventType;
  organizerName: string;
  organizerPhotoUrl: string;
}

export default function EventCard({
  event,
  organizerName,
  organizerPhotoUrl,
}: EventCardProps) {
  const statusColor = getStatusColor(event.status);

  // Get the first ticket price for display
  const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
  const firstTicketPrice = ticketTypes.length > 0 ? ticketTypes[0].price : 0;

  return (
    <Link href={`/event/${event.eventID}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
        <div className="relative">
          <EventThumbnail
            thumbnails={event.thumbnails}
            eventDesc={event.eventDesc}
            eventName={event.eventTitle}
          />
          <div className="absolute top-4 left-4">
            <EventCategories
              categories={event.categories}
              variant="badge"
              maxDisplay={2}
            />
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <EventCategories
                categories={event.categories}
                variant="inline"
                maxDisplay={2}
              />
            </div>
            <span className="text-sm text-gray-500">
              {formatCurrency(firstTicketPrice)}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {event.eventTitle}
          </h3>

          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDateTime(event.startTime)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={organizerPhotoUrl} />
                <AvatarFallback>
                  {organizerName.charAt(0) || "O"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600">
                {organizerName || "Unknown Organizer"}
              </span>
            </div>
            <Badge variant="outline" className={statusColor}>
              {event.status === EVENT_STATUS.PUBLISHED
                ? "Available"
                : event.status === EVENT_STATUS.SOLD_OUT
                  ? "Sold Out"
                  : event.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
