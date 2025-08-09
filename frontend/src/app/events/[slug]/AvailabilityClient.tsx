"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Availability } from "@/schema";
import { fetchAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface AvailabilityClientProps {
  eventId: string;
  slug: string;
  totalCapacity?: number;
}

export function AvailabilityClient({
  eventId,
  slug,
  totalCapacity,
}: AvailabilityClientProps) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAvailability = async (signal?: AbortSignal) => {
    try {
      const data = (await fetchAPI(`/public/events/${eventId}/availability`, {
        signal,
        cache: "no-store",
      })) as Availability;

      setAvailability(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    abortControllerRef.current = new AbortController();
    fetchAvailability(abortControllerRef.current.signal);

    // Set up polling
    intervalRef.current = setInterval(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchAvailability(abortControllerRef.current.signal);
    }, 12000);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [eventId]);

  const isLowStock = (): boolean => {
    if (!availability || !totalCapacity) {
      return (availability?.remaining ?? 0) <= 5;
    }

    return (
      availability.remaining <= Math.max(5, Math.floor(totalCapacity * 0.1))
    );
  };

  const canPurchase = (): boolean => {
    return availability?.status === "ONSALE" && !error;
  };

  const getStatusText = (): string => {
    if (!availability) return "";

    switch (availability.status) {
      case "SOLD_OUT":
        return "Đã hết vé";
      case "PAUSED":
        return "Tạm ngưng bán vé";
      case "ONSALE":
        return `Còn ${availability.remaining} vé`;
      default:
        return "Không có thông tin";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thông tin vé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin vé</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : availability ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Only From:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(availability.price, availability.currency)}
                </span>
              </div>

              <div
                className="flex justify-between items-center"
                aria-live="polite"
                aria-atomic="true"
              >
                <span>Tình trạng</span>
                <span
                  className={`font-medium ${
                    availability.status === "SOLD_OUT"
                      ? "text-red-600"
                      : availability.status === "PAUSED"
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {getStatusText()}
                </span>
              </div>

              {availability.status === "ONSALE" && isLowStock() && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Chỉ còn ít vé! Hãy nhanh tay đặt vé.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!canPurchase()}
              aria-disabled={!canPurchase()}
              onClick={() => {
                // TODO: Navigate to ticket purchase page
                window.open(`/events/${slug}/tickets`, "_blank");
              }}
            >
              {availability.status === "SOLD_OUT"
                ? "Đã hết vé"
                : availability.status === "PAUSED"
                  ? "Tạm ngưng bán"
                  : error
                    ? "Không thể mua vé"
                    : "Mua vé"}
              {canPurchase() && <ExternalLink className="ml-2 h-4 w-4" />}
            </Button>

            {lastUpdate && (
              <p className="text-xs text-gray-500 text-center">
                Cập nhật lúc {lastUpdate.toLocaleTimeString("vi-VN")}
              </p>
            )}
          </>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Không có thông tin vé cho sự kiện này.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
