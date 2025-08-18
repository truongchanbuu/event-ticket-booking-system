"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Minus, Plus, AlertCircle } from "lucide-react";
import { AvailabilityItem } from "@/app/events/[slug]/AvailabilityClient";

function randIdem() {
  // uuid v4 fallback
  // @ts-ignore
  return (
    globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random()}`
  );
}

async function createReservation({
  eventId,
  ttId,
  qty = 1,
}: {
  eventId: string;
  ttId: string;
  qty?: number;
}) {
  const idem = randIdem();

  const doCall = async (): Promise<any> => {
    const res = await fetch(`/api/proxy/public/checkout/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idem,
      },
      body: JSON.stringify({
        eventId,
        lines: [{ ttId, qty }],
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 409 && json?.error === "IDEMPOTENCY_IN_PROGRESS") {
      const wait = Number(json?.retryAfterMs ?? 800);
      await new Promise((r) => setTimeout(r, wait));
      return doCall();
    }

    if (
      res.status === 409 &&
      json?.error === "USER_ALREADY_HAS_HOLD_FOR_EVENT" &&
      json?.reservationId
    ) {
      return { ok: true, reservationId: json.reservationId, payment: null };
    }

    if (!res.ok || !json?.reservationId) {
      throw new Error(json?.error || "CREATE_RESERVATION_FAILED");
    }

    return json; // { ok, reservationId, payment?, ... }
  };

  return doCall();
}

/** Simplified Quantity Stepper */
function QtyStepper({
  value,
  min = 1,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center border rounded-md overflow-hidden bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D+/g, ""));
          if (Number.isFinite(n))
            onChange(Math.min(max, Math.max(min, n || min)));
        }}
        className="w-12 text-center text-sm py-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function TicketTypesDisplay({
  data,
  totalCapacity = 1000,
  eventId,
}: {
  data: AvailabilityItem[];
  totalCapacity?: number;
  eventId: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // qty theo ticketTypeId
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const setQty = (ttId: string, next: number) =>
    setQtyMap((m) => ({ ...m, [ttId]: next }));

  const getTicketStatus = (ticket: AvailabilityItem) => {
    const { remaining, isSoldOut } = ticket;
    const threshold = Math.max(5, Math.floor(totalCapacity * 0.1));

    if (isSoldOut || remaining <= 0) {
      return {
        color: "text-gray-500 bg-gray-100",
        status: "Sold Out",
        urgency: "none" as const,
      };
    }

    if (remaining <= threshold) {
      return {
        color: "text-orange-600 bg-orange-100",
        status: remaining === 1 ? "Last ticket!" : `Only ${remaining} left`,
        urgency: "high" as const,
      };
    }

    return {
      color: "text-green-600 bg-green-100",
      status: "Available",
      urgency: "none" as const,
    };
  };

  const onSelect = async (t: AvailabilityItem, qty: number) => {
    if (loadingId) return;
    setErr(null);
    setLoadingId(t.ticketTypeId);
    try {
      const out = await createReservation({
        eventId,
        ttId: t.ticketTypeId,
        qty,
      });

      if (out?.payment?.transactionId) {
        try {
          sessionStorage.setItem(
            `rid:${out.reservationId}:tx`,
            out.payment.transactionId
          );
        } catch {}
      }

      const reservationID =
        out?.reservationId || out?.rid || out?.reservationID;
      if (reservationID) {
        router.push(`/checkout/${encodeURIComponent(reservationID)}`);
      }
    } catch (e: any) {
      setErr("Cannot reserve a ticket. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Tickets Available
        </h3>
        <p className="text-gray-500">
          Check back soon or contact the organizer
        </p>
      </div>
    );
  }

  const available = data.filter((t) => !t.isSoldOut && (t.remaining ?? 0) > 0);
  const availableCount = available.length;
  const totalRemaining = data.reduce((sum, t) => sum + (t.remaining || 0), 0);
  const lowestPrice =
    availableCount > 0
      ? Math.min(...available.map((t) => t?.price ?? 0))
      : undefined;

  return (
    <div className="bg-white rounded-lg shadow-md border overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Select Tickets
            </h2>
            <p className="text-sm text-gray-600">
              Choose your preferred ticket type
            </p>
          </div>
          <div className="text-sm">
            <div className="text-blue-600 font-medium">
              {availableCount} type{availableCount !== 1 ? "s" : ""} available
            </div>
            {lowestPrice !== undefined && (
              <div className="text-gray-500">
                Starting from {formatPrice(lowestPrice)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {err && (
        <div className="mx-4 mt-4 rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium text-sm">{err}</p>
            <p className="text-red-600 text-xs">
              Please check availability and try again
            </p>
          </div>
        </div>
      )}

      {/* Ticket List */}
      <div className="divide-y">
        {data.map((ticket) => {
          const status = getTicketStatus(ticket);
          const isAvailable = !ticket.isSoldOut && (ticket.remaining ?? 0) > 0;
          const busy = loadingId === ticket.ticketTypeId;

          const maxPerOrder =
            Math.max(
              1,
              Math.min(
                ticket.remaining ?? 0,
                (ticket as any)?.maxPerOrder ?? 10
              )
            ) || 1;

          const qty = Math.min(
            Math.max(1, qtyMap[ticket.ticketTypeId] ?? 1),
            maxPerOrder
          );

          const subtotal =
            (ticket?.price ?? 0) * (Number.isFinite(qty) ? qty : 1);

          const reserveDisabled = !isAvailable || busy || qty < 1;

          return (
            <div
              key={ticket.ticketTypeId}
              className={`p-4 hover:bg-gray-50 ${
                status.urgency === "high" ? "bg-orange-50/50" : ""
              }`}
            >
              {/* Responsive Layout */}
              <div className="space-y-3">
                {/* Title and Status Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                      {ticket.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.status}
                    </span>
                    {status.urgency === "high" && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    )}
                  </div>

                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {formatPrice(ticket?.price ?? 0, ticket.currency)}
                  </div>
                </div>

                {/* Details Row */}
                {isAvailable && (
                  <div className="text-xs text-gray-500">
                    Maximum {maxPerOrder} per order
                  </div>
                )}

                {/* Controls Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <QtyStepper
                      value={qty}
                      max={maxPerOrder}
                      disabled={!isAvailable || busy}
                      onChange={(n) => setQty(ticket.ticketTypeId, n)}
                    />
                    {qty > 1 && (
                      <div className="text-sm">
                        <span className="text-gray-500">Total: </span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(subtotal, ticket.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={reserveDisabled}
                    onClick={() => onSelect(ticket, qty)}
                    className={`py-2 px-4 rounded-md font-medium text-sm transition-colors flex-shrink-0 ${
                      reserveDisabled
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    } ${busy ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {reserveDisabled
                      ? "Unavailable"
                      : busy
                        ? "Reserving..."
                        : `Reserve ${qty} ticket${qty > 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
          <div className="font-medium text-gray-900">
            {totalRemaining} tickets remaining across all types
          </div>
          <div className="font-medium text-gray-900">
            Starting from{" "}
            <span className="text-blue-600">
              {lowestPrice !== undefined ? formatPrice(lowestPrice) : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
