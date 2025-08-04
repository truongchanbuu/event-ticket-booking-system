import { Calendar, Copy, Eye, MapPin, MoreHorizontal } from "lucide-react";
import { getStatusColor, formatDate, formatTime } from "@/lib/utils";
import { Event } from "@/schema";
import Image from "next/image";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";

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
      className="group relative bg-white rounded-2xl shadow-lg border-0 overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.2)",
      }}
    >
      {/* Event Image */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-black/5 z-10"></div>
        <Image
          fill
          src={event.images?.[0]}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Glass morphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20"></div>

        {event.isFeatured && (
          <div className="absolute top-4 left-4 z-30">
            <div className="relative">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4)",
                }}
              >
                ✨ Featured
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-30">
          <div className="relative">
            {/* Status badge with custom styling based on status */}
            <div
              className={`
              inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-lg border shadow-lg transition-all duration-300 hover:scale-105
              ${
                event.status?.toLowerCase() === "active" ||
                event.status?.toLowerCase() === "live"
                  ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/30"
                  : event.status?.toLowerCase() === "upcoming" ||
                      event.status?.toLowerCase() === "scheduled"
                    ? "bg-blue-500/90 text-white border-blue-400/50 shadow-blue-500/30"
                    : event.status?.toLowerCase() === "ended" ||
                        event.status?.toLowerCase() === "completed"
                      ? "bg-gray-500/90 text-white border-gray-400/50 shadow-gray-500/30"
                      : event.status?.toLowerCase() === "cancelled"
                        ? "bg-red-500/90 text-white border-red-400/50 shadow-red-500/30"
                        : event.status?.toLowerCase() === "draft"
                          ? "bg-amber-500/90 text-white border-amber-400/50 shadow-amber-500/30"
                          : "bg-slate-500/90 text-white border-slate-400/50 shadow-slate-500/30"
              }
            `}
            >
              {/* Status indicator dot */}
              <div
                className={`
                w-2 h-2 rounded-full mr-2 animate-pulse
                ${
                  event.status?.toLowerCase() === "active" ||
                  event.status?.toLowerCase() === "live"
                    ? "bg-emerald-200"
                    : event.status?.toLowerCase() === "upcoming" ||
                        event.status?.toLowerCase() === "scheduled"
                      ? "bg-blue-200"
                      : event.status?.toLowerCase() === "ended" ||
                          event.status?.toLowerCase() === "completed"
                        ? "bg-gray-200"
                        : event.status?.toLowerCase() === "cancelled"
                          ? "bg-red-200"
                          : event.status?.toLowerCase() === "draft"
                            ? "bg-amber-200"
                            : "bg-slate-200"
                }
              `}
              ></div>

              {/* Status text */}
              <span className="tracking-wide">
                {event.status?.toLowerCase() === "active"
                  ? "🔥 LIVE"
                  : event.status?.toLowerCase() === "live"
                    ? "🔥 LIVE"
                    : event.status?.toLowerCase() === "upcoming"
                      ? "⏰ UPCOMING"
                      : event.status?.toLowerCase() === "scheduled"
                        ? "📅 SCHEDULED"
                        : event.status?.toLowerCase() === "ended"
                          ? "✅ ENDED"
                          : event.status?.toLowerCase() === "completed"
                            ? "✅ COMPLETED"
                            : event.status?.toLowerCase() === "cancelled"
                              ? "❌ CANCELLED"
                              : event.status?.toLowerCase() === "draft"
                                ? "📝 DRAFT"
                                : event.status.charAt(0).toUpperCase() +
                                  event.status.slice(1)}
              </span>
            </div>

            {/* Glow effect for active/live events */}
            {(event.status?.toLowerCase() === "active" ||
              event.status?.toLowerCase() === "live") && (
              <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-md -z-10 animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Floating action menu */}
        {/* <div className="absolute bottom-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Button
            variant="ghost"
            className="w-10 h-10 rounded-full backdrop-blur-md bg-white/20 border border-white/30 hover:bg-white/30 text-white shadow-lg"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div> */}
      </div>

      {/* Event Content */}
      <div className="relative p-6 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300">
            {event.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Event Details with modern icons */}
        <div className="space-y-3">
          <div className="flex items-center group/item">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover/item:bg-indigo-100 transition-colors duration-200">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {formatDate(event.startTime)} • {formatTime(event.startTime)}
            </span>
          </div>

          <div className="flex items-center group/item">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-50 text-pink-600 group-hover/item:bg-pink-100 transition-colors duration-200">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700 line-clamp-1">
              {event.location.address}
            </span>
          </div>
        </div>

        {/* Categories with pills design */}
        <div className="flex flex-wrap gap-2">
          {event.categories.slice(0, 3).map((category, index) => (
            <span
              key={category}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${
                  index === 0
                    ? "#e0e7ff, #c7d2fe"
                    : index === 1
                      ? "#fce7f3, #fbcfe8"
                      : "#ecfdf5, #d1fae5"
                })`,
                color:
                  index === 0 ? "#4f46e5" : index === 1 ? "#ec4899" : "#059669",
              }}
            >
              {toUpperCaseFirstLetter(category)}
            </span>
          ))}
          {event.categories.length > 3 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 hover:scale-105">
              +{event.categories.length - 3}
            </span>
          )}
        </div>

        {/* Stats with modern cards */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {[
            {
              label: "Participants",
              value: event.stats?.participantCount || 0,
              color: "from-blue-500 to-cyan-500",
            },
            {
              label: "Tickets Sold",
              value: event.stats.ticketSoldCount,
              color: "from-emerald-500 to-teal-500",
            },
            {
              label: "Check-ins",
              value: event.stats.checkInCount,
              color: "from-purple-500 to-pink-500",
            },
          ].map((stat, index) => (
            <div key={stat.label} className="relative group/stat">
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-all duration-300 hover:scale-105 hover:shadow-md">
                <div
                  className={`text-lg font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-1">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons with modern design */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleViewDetail}
            className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 border-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>

          <Button className="h-12 w-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-600 hover:text-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-0">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  );
}
