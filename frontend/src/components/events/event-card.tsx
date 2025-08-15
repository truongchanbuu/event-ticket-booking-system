import { Calendar, Copy, Eye, MapPin } from "lucide-react";
import {
  getStatusColor,
  formatDate,
  formatTime,
  safeFormatTime,
  safeFormatDate,
  toInt,
  toUpperFirstSafe,
} from "@/lib/utils";
import { Event, EventStats } from "@/schema";
import Image from "next/image";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";

interface EventCardProps {
  event: Event | Partial<Event> | null | undefined;
}

const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><rect width='100%' height='100%' fill='#eef2ff'/><text x='50%' y='50%' font-family='system-ui,Segoe UI,Roboto' font-size='42' text-anchor='middle' dominant-baseline='middle' fill='#6366f1'>Event</text></svg>`
  );

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();

  // ===== Fallbacks an toàn cho mọi field =====
  const ev = (event ?? {}) as Partial<Event> & {
    images?: string[];
    categories?: string[];
    status?: string;
    isFeatured?: boolean;
    startTime?: string | number | Date | null;
    location?: { address?: string | null } | null;
    stats?: {
      participantCount?: number | null;
      ticketSoldCount?: number | null;
      checkInCount?: number | null;
    } | null;
  };

  const eventID = String(ev.eventID ?? "").trim();
  const title = (ev.title ?? "Untitled Event").toString();
  const description = (ev.description ?? "No description provided.").toString();

  const imgSrc =
    (Array.isArray(ev.images) &&
      typeof ev.images[0] === "string" &&
      ev.images[0]) ||
    PLACEHOLDER_SVG;

  const isFeatured = Boolean(ev.isFeatured);

  const statusRaw = (ev.status ?? "unknown").toString();
  const status = statusRaw.toLowerCase();

  const start = ev.startTime ?? null;
  const hasStart = Boolean(start);
  const startDateStr = hasStart ? safeFormatDate(start) : "TBA";
  const startTimeStr = hasStart ? safeFormatTime(start) : "";

  const address = ev.location?.address || "TBA";

  const categories = Array.isArray(ev.categories)
    ? ev.categories.filter((c) => typeof c === "string" && c.trim() !== "")
    : [];

  const stats: EventStats | undefined = ev.stats;
  const participantCount = toInt(stats?.participantCount, 0);
  const ticketSoldCount = toInt(stats?.ticketSoldCount, 0);
  const checkInCount = toInt(stats?.checkInCount, 0);

  // ===== Gom styling & label theo status (tránh lặp và undefined) =====
  const STATUS_MAP: Record<
    string,
    { badge: string; dot: string; label: string; glow?: string }
  > = {
    active: {
      badge:
        "bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/30",
      dot: "bg-emerald-200",
      label: "🔥 LIVE",
      glow: "bg-emerald-400/20",
    },
    live: {
      badge:
        "bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/30",
      dot: "bg-emerald-200",
      label: "🔥 LIVE",
      glow: "bg-emerald-400/20",
    },
    upcoming: {
      badge: "bg-blue-500/90 text-white border-blue-400/50 shadow-blue-500/30",
      dot: "bg-blue-200",
      label: "⏰ UPCOMING",
    },
    scheduled: {
      badge: "bg-blue-500/90 text-white border-blue-400/50 shadow-blue-500/30",
      dot: "bg-blue-200",
      label: "📅 SCHEDULED",
    },
    ended: {
      badge: "bg-gray-500/90 text-white border-gray-400/50 shadow-gray-500/30",
      dot: "bg-gray-200",
      label: "✅ ENDED",
    },
    completed: {
      badge: "bg-gray-500/90 text-white border-gray-400/50 shadow-gray-500/30",
      dot: "bg-gray-200",
      label: "✅ COMPLETED",
    },
    cancelled: {
      badge: "bg-red-500/90 text-white border-red-400/50 shadow-red-500/30",
      dot: "bg-red-200",
      label: "❌ CANCELLED",
    },
    draft: {
      badge:
        "bg-amber-500/90 text-white border-amber-400/50 shadow-amber-500/30",
      dot: "bg-amber-200",
      label: "📝 DRAFT",
    },
    unknown: {
      badge:
        "bg-slate-500/90 text-white border-slate-400/50 shadow-slate-500/30",
      dot: "bg-slate-200",
      label: toUpperFirstSafe(statusRaw),
    },
  };

  const sCfg = STATUS_MAP[status] ?? STATUS_MAP["unknown"];
  const statusColor = getStatusColor(ev.status as any); // giữ tương thích nếu bạn dùng ở nơi khác

  const handleViewDetail = () => {
    if (!eventID) return; // tránh push với id rỗng
    router.push(`/profile/events/dashboard/${eventID}`);
  };

  return (
    <div
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
        <div className="absolute inset-0 bg-black/5 z-10" />
        <Image
          fill
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20" />

        {isFeatured && (
          <div className="absolute top-4 left-4 z-30">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4)",
              }}
            >
              ✨ Featured
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 z-30">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-lg border shadow-lg transition-all duration-300 hover:scale-105 ${sCfg.badge}`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 animate-pulse ${sCfg.dot}`}
            />
            <span className="tracking-wide">{sCfg.label}</span>
          </div>

          {(status === "active" || status === "live") && sCfg.glow && (
            <div
              className={`absolute inset-0 rounded-2xl ${sCfg.glow} blur-md -z-10 animate-pulse`}
            />
          )}
        </div>
      </div>

      {/* Event Content */}
      <div className="relative p-6 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center group/item">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover/item:bg-indigo-100 transition-colors duration-200">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {startDateStr}
              {startTimeStr ? ` • ${startTimeStr}` : ""}
            </span>
          </div>

          <div className="flex items-center group/item">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-50 text-pink-600 group-hover/item:bg-pink-100 transition-colors duration-200">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700 line-clamp-1">
              {address}
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 3).map((category, index) => (
            <span
              key={`${category}-${index}`}
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
              {toUpperFirstSafe(category)}
            </span>
          ))}
          {categories.length > 3 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 hover:scale-105">
              +{categories.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {[
            {
              label: "Participants",
              value: participantCount,
              color: "from-blue-500 to-cyan-500",
            },
            {
              label: "Tickets Sold",
              value: ticketSoldCount,
              color: "from-emerald-500 to-teal-500",
            },
            {
              label: "Check-ins",
              value: checkInCount,
              color: "from-purple-500 to-pink-500",
            },
          ].map((stat) => (
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleViewDetail}
            disabled={!eventID}
            aria-disabled={!eventID}
            className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 border-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>

          <Button
            className="h-12 w-12 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-600 hover:text-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-0"
            type="button"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
