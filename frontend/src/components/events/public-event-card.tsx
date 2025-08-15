import { Event } from "@/schema";
import EventThumbnail from "./event-thumb";
import { Calendar, Clock, MapPin, Tag, Users } from "lucide-react";
import Link from "next/link";
import { memo, useMemo } from "react";

/* =================== Formatters & Helpers (outside render) =================== */
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function stripHtml(input: unknown): string {
  const s = typeof input === "string" ? input : String(input ?? "");
  // Nhanh-gọn, tránh regex nặng nề khi input rỗng
  return s.replace(/<[^>]*>/g, "");
}

function safeDate(d: unknown): Date | null {
  const date = new Date(d as any);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(d: unknown): string {
  const dt = safeDate(d);
  return dt ? DATE_FMT.format(dt) : "TBA";
}

function formatTime(d: unknown): string {
  const dt = safeDate(d);
  return dt ? TIME_FMT.format(dt) : "";
}

function getDuration(start: unknown, end: unknown): string {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return "—";
  const diffH = Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60);
  if (diffH < 1) {
    // làm tròn phút cho event ngắn
    const m = Math.round(diffH * 60);
    return `${m}m`;
  }
  if (diffH < 24) return `${Math.round(diffH)}h`;
  return `${Math.round(diffH / 24)}d`;
}

const CATEGORY_COLORS: Record<string, string> = {
  gala: "bg-purple-100 text-purple-700",
  networking: "bg-blue-100 text-blue-700",
  conference: "bg-green-100 text-green-700",
  workshop: "bg-orange-100 text-orange-700",
  // default sẽ dùng bên dưới
};

function getCategoryColor(category: unknown): string {
  const key = String(category ?? "")
    .toLowerCase()
    .trim();
  return CATEGORY_COLORS[key] || "bg-gray-100 text-gray-700";
}

function initialsDataUrl(name: unknown): string {
  const s = String(name ?? "U");
  const initials = s
    .split(/\s+/)
    .map((t) => t[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='100%' height='100%' rx='8' ry='8' fill='#eef2ff'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='system-ui,Segoe UI,Roboto' font-size='24' fill='#6366f1'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function toNonNegInt(n: unknown, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/* =================== Component =================== */
export const PublicEventCard = memo(function PublicEventCard({
  event,
}: {
  event: Partial<Event>;
}) {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  const ev = event ?? {};

  const title = (ev.title || "Untitled Event") as string;
  const descText = useMemo(() => stripHtml(ev.description), [ev.description]);

  const thumbnails = (Array.isArray(ev.images) ? ev.images : []) as string[];
  const isSoldOut = Boolean(ev.isAllSoldOut);

  const categories = useMemo(
    () =>
      (Array.isArray(ev.categories)
        ? ev.categories.filter((c) => typeof c === "string" && c.trim())
        : []) as string[],
    [ev.categories]
  );

  const organizerName = (ev.organizer?.name || "Unknown Organizer") as string;
  const organizerPhoto =
    (ev.organizer?.photoUrl as string) || initialsDataUrl(organizerName);

  const startDateStr = formatDate(ev.startTime);
  const startTimeStr = formatTime(ev.startTime);
  const durationStr = getDuration(ev.startTime, ev.endTime);

  const address = (ev.location?.address as string) || "TBA";

  const participantCount = toNonNegInt(ev.stats?.participantCount, 0);

  // Link đích (public): ưu tiên slug, fallback eventID; nếu thiếu → disable
  const href =
    (ev.slug && `/events/${ev.slug}`) ||
    (ev.eventID && `/events/${ev.eventID}`) ||
    "";

  return (
    <article
      aria-label={title}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
    >
      {/* Thumbnail */}
      <div className="relative">
        <EventThumbnail
          thumbnails={thumbnails}
          eventName={title}
          eventDesc={descText}
        />

        {/* Status badges */}
        <div className="absolute top-4 left-4 z-20">
          {isSoldOut && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow">
              Sold Out
            </span>
          )}
        </div>

        {/* Category badges */}
        {categories.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex flex-wrap gap-2 max-w-[75vw] sm:max-w-none">
              {categories.slice(0, 3).map((category, idx) => (
                <span
                  key={`${category}-${idx}`}
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getCategoryColor(
                    category
                  )}`}
                  title={category}
                >
                  <Tag className="w-3 h-3 inline mr-1" />
                  {category}
                </span>
              ))}
              {categories.length > 3 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  +{categories.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
          {title}
        </h3>

        {/* Organizer */}
        <div className="flex items-center mb-4">
          {/* Dùng <img> để khỏi cấu hình domain cho next/image avatar */}
          <img
            src={organizerPhoto}
            alt={organizerName}
            className="w-8 h-8 rounded-full mr-3 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                initialsDataUrl(organizerName);
            }}
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">{organizerName}</p>
            <p className="text-xs text-gray-500">Event Organizer</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          {/* Date & Time */}
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-3 text-blue-500" />
            <div className="text-sm">
              <span className="font-medium">{startDateStr}</span>
              {startTimeStr && (
                <>
                  <span className="mx-2">•</span>
                  <span>{startTimeStr}</span>
                </>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-3 text-green-500" />
            <span className="text-sm">Duration: {durationStr}</span>
          </div>

          {/* Location */}
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-3 text-red-500" />
            <span className="text-sm truncate">{address}</span>
          </div>

          {/* Participants */}
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-3 text-purple-500" />
            <span className="text-sm">{participantCount} participants</span>
          </div>
        </div>

        {/* Action */}
        {href ? (
          <Link
            href={href}
            className="block w-full text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            View Event Details
          </Link>
        ) : (
          <button
            className="w-full bg-gray-200 text-gray-600 font-medium py-3 px-6 rounded-xl cursor-not-allowed opacity-70"
            disabled
            aria-disabled="true"
            title="Missing event URL"
          >
            View Event Details
          </button>
        )}
      </div>
    </article>
  );
});
