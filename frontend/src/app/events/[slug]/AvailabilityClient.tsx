"use client";

import { useEffect, useRef, useState } from "react";
import { useAvailabilityPolling } from "@/hooks/use-availability-polling";
import PurchaseButton from "./PurchaseButton";
import {
  AlertCircle,
  Calendar,
  Info,
  Loader2,
  Package,
  Search,
  ShoppingCart,
} from "lucide-react";

export function AvailabilityClient({
  eventID,
  slug,
  totalCapacity = 0,
}: {
  eventID: string;
  slug: string;
  totalCapacity?: number;
}) {
  const [sseOk, setSseOk] = useState<boolean>(false);

  useEffect(() => {
    if (!eventID) return;
    const es = new EventSource(`/api/proxy/stream/availability/${eventID}`);
    const onUpdate = (ev: MessageEvent) => {
      // nếu muốn: set state từ SSE và setSseOk(true)
      setSseOk(true);
      // parse payload & cập nhật UI tuỳ bạn
    };
    es.addEventListener("update", onUpdate);
    es.onerror = () => {
      es.close();
      setSseOk(false);
    };
    return () => {
      es.removeEventListener("update", onUpdate);
      es.close();
    };
  }, [eventID]);

  // 2) polling fallback (chạy khi sseOk=false)
  const { data, loading, error } = useAvailabilityPolling(slug, {
    enabled: !sseOk,
    baseIntervalMs: 12_000,
  });

  const remaining = (data ?? []).reduce(
    (sum, x) => sum + (x?.remaining || 0),
    0
  );
  const soldOut = remaining <= 0;
  const threshold = Math.max(5, Math.floor(totalCapacity * 0.1));
  const lowStock = !soldOut && remaining <= threshold;

  return (
    <section className="rounded-2xl border p-4" aria-live="polite">
      <h2 className="text-xl font-semibold">Ticket Info</h2>
      {loading && !data ? (
        <div className="flex flex-col items-center py-8 space-y-3">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-600">Loading event details...</p>
        </div>
      ) : error === "CANCELLED" ? (
        <div className="flex flex-col items-center py-8 space-y-2">
          <Calendar className="w-6 h-6 text-red-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-red-700">Event Cancelled</p>
            <p className="text-xs text-red-600">
              This event is no longer available
            </p>
          </div>
        </div>
      ) : error === "NOT_FOUND" ? (
        <div className="flex flex-col items-center py-8 space-y-2">
          <Search className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Event Not Found</p>
            <p className="text-xs text-gray-500">
              The event you're looking for doesn't exist
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-8 space-y-2">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-red-700">
              Something went wrong
            </p>
            <p className="text-xs text-red-600">
              Failed to load event information
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-lg mt-4 p-4 border ${
            soldOut
              ? "bg-red-50 border-red-100"
              : lowStock
                ? "bg-blue-50 border-blue-100"
                : "bg-green-50 border-green-100"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="mt-0.5">
              {soldOut ? (
                <Package className="w-5 h-5 text-red-500" />
              ) : lowStock ? (
                <Info className="w-5 h-5 text-blue-500" />
              ) : (
                <ShoppingCart className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="space-y-1">
              <p
                className={`text-lg font-semibold ${
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
                className={`text-sm ${
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
  );
}
