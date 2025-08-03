import { Calendar, Copy, Eye, MapPin, MoreHorizontal } from "lucide-react";
import { getStatusColor, formatDate, formatTime } from "@/lib/utils";
import { Event } from "@/schema";
import Image from "next/image";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const statusColor = getStatusColor(event.status);

  const handleViewDetail = () => {
    router.push(`/profile/events/dashboard/${event.eventID}`);
  };

  return (
    <div
      key={event.eventID}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Event Image */}
      <div className="relative h-48">
        <Image
          fill
          src={event.images?.[0]}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        {event.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Featured
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Event Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {event.title}
          </h3>
          <div className="relative ml-2">
            <Button variant="ghost" className="hover:bg-gray-100">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {formatDate(event.startTime)} • {formatTime(event.startTime)}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="line-clamp-1">{event.location.address}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1 mb-4">
          {event.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
            >
              {category}
            </span>
          ))}
          {event.categories.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
              +{event.categories.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {event.stats?.participantCount || 0}
            </div>
            <div className="text-xs text-gray-500">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {event.stats.ticketSoldCount}
            </div>
            <div className="text-xs text-gray-500">Tickets Sold</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {event.stats.checkInCount}
            </div>
            <div className="text-xs text-gray-500">Check-ins</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleViewDetail}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>

          <Button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
