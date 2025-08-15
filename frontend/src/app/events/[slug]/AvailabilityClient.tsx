"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useAvailabilityPolling } from "@/hooks/use-availability-polling";
import { TicketTypesDisplay } from "@/components/ticket/ticket-display";
import {
  AlertCircle,
  Calendar,
  Info,
  Loader2,
  Package,
  Search,
  ShoppingCart,
} from "lucide-react";

export type AvailabilityItem = {
  ticketTypeId: string;
  remaining: number;
  isSoldOut?: boolean;
  name?: string;
  price?: number;
  currency?: string;
};

type AvailabilitySnapshot = {
  status: number;
  data: AvailabilityItem[];
  etag?: string;
  lastUpdatedAt?: string;
};

export function AvailabilityClient({
  eventID,
  slug,
  totalCapacity = 0,
}: {
  eventID: string;
  slug: string;
  totalCapacity?: number;
}) {
  const esRef = useRef<EventSource | null>(null);

  // SSE states
  const [allowPolling, setAllowPolling] = useState(false);
  const [sseTried, setSseTried] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [liveSnap, setLiveSnap] = useState<AvailabilitySnapshot | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [sseError, setSseError] = useState<
    null | "CANCELLED" | "NOT_FOUND" | "GENERIC"
  >(null);

  const {
    data: polledData,
    loading,
    error: pollError,
  } = useAvailabilityPolling(slug, {
    enabled: allowPolling && !sseConnected,
    baseIntervalMs: 12_000,
    etag,
  });

  const data: AvailabilityItem[] | null = useMemo(() => {
    if (liveSnap?.status === 200 && Array.isArray(liveSnap?.data))
      return liveSnap.data;
    if (Array.isArray(polledData)) return polledData;
    return null;
  }, [liveSnap, polledData]);

  const viewError = useMemo(() => {
    if (Array.isArray(data)) return null;
    return sseError ?? pollError ?? null;
  }, [data, sseError, pollError]);

  const remaining = (data ?? []).reduce(
    (sum, x) => sum + (x?.remaining || 0),
    0
  );

  const soldOut = remaining <= 0;
  const threshold = Math.max(5, Math.floor(totalCapacity * 0.1));
  const lowStock = !soldOut && remaining <= threshold;

  useEffect(() => {
    if (!slug) return;

    setSseTried(false);
    setSseConnected(false);
    setAllowPolling(false);

    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }

    const es = new EventSource(
      `/api/availability/stream/${eventID}/${encodeURIComponent(slug)}`
    );
    esRef.current = es;
    setSseTried(true);
    setSseError(null);

    // Grace period: cho SSE 2s để open/update trước khi bật polling
    const grace = setTimeout(() => setAllowPolling(true), 2000);

    es.onopen = () => {
      setSseConnected(true);
      // nhận open rồi thì tắt cho phép polling (nếu trước đó đã bật)
      setAllowPolling(false);
    };

    const onUpdate = (ev: MessageEvent) => {
      try {
        const snap: AvailabilitySnapshot = JSON.parse(ev.data);
        setLiveSnap(snap || null);
        setEtag(snap?.etag ?? null);
        setSseConnected(true);
        setAllowPolling(false);
        setSseError(null);
      } catch {}
    };
    es.addEventListener("update", onUpdate);
    es.onmessage = onUpdate;
    es.addEventListener("ping", () => {});

    es.onerror = () => {
      setSseConnected(false);
      setAllowPolling(true);
    };

    const onErrorEvent = (ev: MessageEvent) => {
      try {
        const err = JSON.parse(ev.data);
        if (err?.status === 410) setSseError("CANCELLED");
        else if (err?.status === 404) setSseError("NOT_FOUND");
        else setSseError("GENERIC");
      } catch {
        setSseError("GENERIC");
      }
    };
    es.addEventListener("error", onErrorEvent);

    return () => {
      clearTimeout(grace);
      es.removeEventListener("update", onUpdate);
      es.removeEventListener("error", onErrorEvent);
      try {
        es.close();
      } catch {}
      esRef.current = null;
    };
  }, [slug, eventID]);

  return (
    <section
      className="rounded-xl sm:rounded-2xl border p-3 sm:p-4"
      aria-live="polite"
    >
      <section>
        <h2 className="text-lg sm:text-xl font-semibold">Ticket Info</h2>

        {!data && loading ? (
          <div className="flex flex-col items-center py-6 sm:py-8 space-y-3">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 animate-spin" />
            <p className="text-xs sm:text-sm text-gray-600 text-center px-4">
              Loading event details...
            </p>
          </div>
        ) : viewError === "CANCELLED" ? (
          <div className="flex flex-col items-center py-6 sm:py-8 space-y-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            <div className="text-center px-4">
              <p className="text-xs sm:text-sm font-medium text-red-700">
                Event Cancelled
              </p>
              <p className="text-xs text-red-600 mt-1">
                This event is no longer available
              </p>
            </div>
          </div>
        ) : viewError === "NOT_FOUND" ? (
          <div className="flex flex-col items-center py-6 sm:py-8 space-y-2">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            <div className="text-center px-4">
              <p className="text-xs sm:text-sm font-medium text-gray-700">
                Event Not Found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The event you're looking for doesn't exist
              </p>
            </div>
          </div>
        ) : viewError ? (
          <div className="flex flex-col items-center py-6 sm:py-8 space-y-2">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            <div className="text-center px-4">
              <p className="text-xs sm:text-sm font-medium text-red-700">
                Something went wrong
              </p>
              <p className="text-xs text-red-600 mt-1">
                Failed to load event information
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-lg mt-3 sm:mt-4 p-3 sm:p-4 border ${
              soldOut
                ? "bg-red-50 border-red-100"
                : lowStock
                  ? "bg-blue-50 border-blue-100"
                  : "bg-green-50 border-green-100"
            }`}
          >
            <div className="flex items-start sm:items-center space-x-3">
              <div className="mt-0.5 flex-shrink-0">
                {soldOut ? (
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                ) : lowStock ? (
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                ) : (
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <p
                  className={`text-base sm:text-lg font-semibold leading-tight ${
                    soldOut
                      ? "text-red-700"
                      : lowStock
                        ? "text-blue-700"
                        : "text-green-700"
                  }`}
                >
                  {soldOut
                    ? "Sold Out"
                    : remaining === 1
                      ? "Last One!"
                      : lowStock
                        ? `Only ${remaining} Left`
                        : `${remaining} Available`}
                </p>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    soldOut
                      ? "text-red-600"
                      : lowStock
                        ? "text-blue-600"
                        : "text-green-600"
                  }`}
                >
                  {soldOut
                    ? "This item is currently unavailable"
                    : remaining === 1
                      ? "Only 1 ticket remaining"
                      : lowStock
                        ? "Limited availability - act fast!"
                        : remaining > 10
                          ? "Good availability"
                          : "Limited quantity"}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {!!data?.length && (
        <div className="mt-4 sm:mt-6">
          <TicketTypesDisplay
            eventId={eventID}
            data={data}
            totalCapacity={totalCapacity}
          />
        </div>
      )}
    </section>
  );
}
