"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/** =======================
 * Types
 * ======================= */

type Buyer = {
  email: string;
  phone: string;
  name?: string;
};

type ReservationResp = {
  ttlMs: number;
  serverTime: number;
  lines?: Array<{
    ttId: string;
    qty: number;
    title?: string;
  }>;
  reservationId: string;
};

type IntentUIQr = { kind: "qr"; url: string };
type IntentUIRedirect = { kind: "redirect"; url: string };
type IntentUI = IntentUIQr | IntentUIRedirect;

type IntentResp = {
  paymentIntentID: string;
  transactionId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  expiresAt?: number | string; // epoch ms or ISO
  ui: IntentUI;
};

type IntentStatusResp = {
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  orderId?: string;
  claim?: { url: string };
  transactionId: string;
  paymentIntentID?: string;
  ui?: IntentUI;
  expiresAt?: number | string;
  message?: string;
};

type Phase = "idle" | "minting" | "creating" | "awaiting" | "success";
type Provider = "momo" | "zalopay" | "stripe";

/** =======================
 * Small utils
 * ======================= */

const classNames = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const toEpochMs = (t?: number | string) => {
  if (!t) return undefined;
  return typeof t === "number" ? t : Date.parse(t);
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const msToMMSS = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
};

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** =======================
 * Storage helpers (sessionStorage)
 * ======================= */

const buyerKey = (rid: string) => `rid:${rid}:buyer`;
const txKey = (rid: string) => `rid:${rid}:tx`;

type StoredBuyer = { buyer: Buyer; expAt: number };
type StoredTx = {
  transactionId: string;
  paymentIntentID?: string;
  provider: Provider;
  expiresAt?: number; // epoch ms
  ui?: IntentUI;
};

export function saveBuyerLocal(rid: string, buyer: Buyer, ttlMs: number) {
  if (typeof window === "undefined") return;
  const expAt = Date.now() + Math.max(0, ttlMs);
  const payload: StoredBuyer = { buyer, expAt };
  sessionStorage.setItem(buyerKey(rid), JSON.stringify(payload));
}

export function loadBuyerLocal(rid: string): Buyer | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(buyerKey(rid));
  const parsed = safeParseJSON<StoredBuyer>(raw);
  if (!parsed) return null;
  if (Date.now() > parsed.expAt) {
    sessionStorage.removeItem(buyerKey(rid));
    return null;
  }
  return parsed.buyer;
}

export function saveTx(rid: string, tx: StoredTx) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(txKey(rid), JSON.stringify(tx));
}

export function loadTx(rid: string): StoredTx | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(txKey(rid));
  const parsed = safeParseJSON<StoredTx>(raw);
  return parsed || null;
}

export function clearTx(rid: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(txKey(rid));
}

/** =======================
 * Idempotency helper
 * ======================= */

export function randIdem(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  // Fallback UUIDv4-ish
  const rnd = (n = 16) =>
    Array.from({ length: n }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-a${rnd(3)}-${rnd(12)}`.toLowerCase();
}

/** =======================
 * API helpers
 * ======================= */

async function fetchJSON<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    // Rate limit toast info
    if (res.status === 429) {
      const retryHeader = res.headers.get("Retry-After");
      let retryAfterSec: number | undefined;
      if (retryHeader) {
        const n = Number(retryHeader);
        if (!isNaN(n)) retryAfterSec = n;
      }
      try {
        const body = await res.json();
        if (!retryAfterSec && typeof body?.retryAfterSec === "number") {
          retryAfterSec = body.retryAfterSec;
        }
        throw Object.assign(new Error("RATE_LIMITED"), {
          code: 429,
          retryAfterSec,
          detail: body,
        });
      } catch {
        throw Object.assign(new Error("RATE_LIMITED"), {
          code: 429,
          retryAfterSec,
        });
      }
    }
    let errBody: any = undefined;
    try {
      errBody = await res.json();
    } catch {}
    const e = new Error("HTTP_ERROR");
    (e as any).code = res.status;
    (e as any).detail = errBody;
    throw e;
  }
  return res.json() as Promise<T>;
}

async function apiGetReservation(rid: string): Promise<ReservationResp> {
  return fetchJSON<ReservationResp>(
    `/api/proxy/public/reservations/${encodeURIComponent(rid)}`,
    {
      method: "GET",
    }
  );
}

async function apiPostBuyerClaim(
  rid: string,
  buyer: Buyer
): Promise<{ buyerClaim: string }> {
  return fetchJSON<{ buyerClaim: string }>(
    `/api/proxy/public/reservations/${encodeURIComponent(rid)}/buyer-claim`,
    {
      method: "POST",
      headers: { "Idempotency-Key": randIdem() },
      body: JSON.stringify({ buyer }),
    }
  );
}

async function apiPostCreateIntent(params: {
  rid: string;
  buyerClaim: string;
  provider: Provider;
  ttlMs: number;
}): Promise<IntentResp> {
  return fetchJSON<IntentResp>(`/api/proxy/public/payments/intents`, {
    method: "POST",
    headers: { "Idempotency-Key": randIdem() },
    body: JSON.stringify({
      reservationId: params.rid,
      buyerClaim: params.buyerClaim,
      provider: params.provider,
      ttlMs: params.ttlMs,
    }),
  });
}

async function apiGetIntentByTx(
  transactionId: string
): Promise<IntentStatusResp> {
  const id = encodeURIComponent(transactionId);
  return fetchJSON<IntentStatusResp>(
    `/api/proxy/public/payments/intents/${id}?by=tx&refresh=1`,
    {
      method: "GET",
    }
  );
}

/** =======================
 * Validators
 * ======================= */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigitsRegex = /^\d{8,15}$/;

function validateBuyer(b: Buyer) {
  const errors: Partial<Record<keyof Buyer, string>> = {};
  if (!b.email || !emailRegex.test(b.email))
    errors.email = "Please enter a valid email address";
  if (!b.phone || !phoneDigitsRegex.test(b.phone))
    errors.phone = "Phone number must be 8-15 digits";
  // name optional
  return errors;
}

/** =======================
 * UI Components
 * ======================= */

function Countdown({
  targetMs,
  altTargetMs,
}: {
  targetMs?: number | null;
  /** If provided, countdown to min(targetMs, altTargetMs) */
  altTargetMs?: number;
}) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const effectiveTarget = useMemo(() => {
    if (!targetMs && !altTargetMs) return undefined;
    if (targetMs && altTargetMs) return Math.min(targetMs, altTargetMs);
    return targetMs ?? altTargetMs;
  }, [targetMs, altTargetMs]);

  const left = Math.max(0, (effectiveTarget ?? 0) - now);
  const critical = left <= 30_000;
  return (
    <div className="flex items-center space-x-3">
      <div
        className={classNames(
          "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-300",
          critical
            ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 ring-2 ring-red-200 animate-pulse"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-200"
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={classNames(
            "w-2 h-2 rounded-full mr-3 transition-colors duration-300",
            critical ? "bg-red-400 animate-ping" : "bg-blue-400"
          )}
        />
        <span className="text-xs uppercase tracking-wide">Time Remaining:</span>
        <span className="ml-2 text-lg tabular-nums font-bold">
          {msToMMSS(left)}
        </span>
      </div>
      {critical && (
        <div className="flex items-center text-red-600 text-sm font-medium animate-bounce">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Expiring Soon
        </div>
      )}
    </div>
  );
}

function ProviderPicker({
  value,
  onChange,
  disabled,
}: {
  value: Provider;
  onChange: (v: Provider) => void;
  disabled?: boolean;
}) {
  const opts: Array<{
    key: Provider;
    label: string;
    hint?: string;
    available: boolean;
  }> = [
    {
      key: "momo",
      label: "MoMo",
      hint: "Scan QR to pay instantly",
      available: true,
    },
    // { key: "zalopay", label: "ZaloPay", hint: "Quick QR payment", available: false },
    // { key: "stripe", label: "Credit Card", hint: "Via Stripe (redirects)", available: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {opts.map((o) => (
          <label
            key={o.key}
            className={classNames(
              "relative flex items-center gap-4 rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 group",
              value === o.key && o.available
                ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md ring-2 ring-indigo-200"
                : o.available
                  ? "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                  : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <div
              className={classNames(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                value === o.key && o.available
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 group-hover:border-indigo-400"
              )}
            >
              {value === o.key && o.available && (
                <div className="w-2 h-2 bg-white rounded-full animate-scale-in"></div>
              )}
            </div>

            <div className="flex-grow">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-gray-900">
                  {o.label}
                </span>
                {o.key === "momo" && (
                  <div className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                    Recommended
                  </div>
                )}
                {!o.available && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
              {o.hint && <p className="text-sm text-gray-500 mt-1">{o.hint}</p>}
            </div>

            <input
              type="radio"
              name="provider"
              value={o.key}
              className="sr-only"
              checked={value === o.key}
              onChange={() => o.available && onChange(o.key)}
              disabled={disabled || !o.available}
            />

            {!o.available && (
              <div className="absolute inset-0 rounded-2xl bg-gray-50 bg-opacity-75 flex items-center justify-center">
                <span className="text-gray-400 text-sm font-medium">
                  Coming Soon
                </span>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function ContactForm({
  buyer,
  setBuyer,
  disabled,
  errors,
}: {
  buyer: Buyer;
  setBuyer: (b: Buyer) => void;
  disabled?: boolean;
  errors: Partial<Record<keyof Buyer, string>>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-900">
          Contact Information
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              className={classNames(
                "w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 outline-none",
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 bg-white hover:border-gray-300"
              )}
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              disabled={disabled}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </div>
          </div>
          {errors.email && (
            <p
              id="email-error"
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0123456789"
              className={classNames(
                "w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 outline-none",
                errors.phone
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 bg-white hover:border-gray-300"
              )}
              value={buyer.phone}
              onChange={(e) =>
                setBuyer({
                  ...buyer,
                  phone: e.target.value.replace(/\D+/g, ""),
                })
              }
              disabled={disabled}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
          </div>
          {errors.phone && (
            <p
              id="phone-error"
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.phone}</span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Full Name <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="relative">
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 outline-none bg-white hover:border-gray-300"
            value={buyer.name ?? ""}
            onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
            disabled={disabled}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrPanel({
  qrUrl,
  deadlineMs,
  qrExpireMs,
  onCheck,
}: {
  qrUrl: string;
  deadlineMs?: number;
  qrExpireMs?: number;
  onCheck: () => void;
}) {
  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-3xl p-8 border border-pink-100 shadow-lg">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">
              Scan to Pay with MoMo
            </h3>
            <p className="text-gray-600">
              Open MoMo app and scan this QR code to complete payment
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-300 to-purple-300 rounded-3xl blur opacity-20 animate-pulse"></div>
              <div className="relative bg-white p-6 rounded-3xl shadow-xl border-4 border-white">
                <img
                  src={qrUrl}
                  alt="MoMo payment QR code"
                  className="w-64 h-64 object-contain"
                />
                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-gray-900/10"></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Countdown targetMs={deadlineMs} altTargetMs={qrExpireMs} />

            <button
              type="button"
              className="inline-flex items-center justify-center space-x-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              onClick={onCheck}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>I've Paid / Check Status</span>
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            💡 <strong>How to pay:</strong> Open MoMo app → Tap "Scan QR" →
            Point camera at QR code → Confirm payment
          </div>
        </div>
      </div>
    </div>
  );
}

/** =======================
 * Toast
 * ======================= */

function Toast({ message, onClose }: { message: string; onClose(): void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-6 py-4 text-sm text-white shadow-2xl border border-gray-700 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}

/** =======================
 * Page
 * ======================= */

export default function Page() {
  const params = useParams<{ rid: string }>();
  const rid = String(params?.rid || "");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [provider, setProvider] = useState<Provider>("momo");
  const [buyer, setBuyer] = useState<Buyer>(
    () => loadBuyerLocal(rid) ?? { email: "", phone: "", name: "" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Buyer, string>>>(
    {}
  );

  // Reservation timing
  const [reservation, setReservation] = useState<ReservationResp | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0); // serverTime - clientNow
  const deadlineMs = useMemo(() => {
    if (!reservation) return undefined;
    return reservation.serverTime + reservation.ttlMs;
  }, [reservation]);

  // Intent / TX
  const [tx, setTx] = useState<StoredTx | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrExpireMs, setQrExpireMs] = useState<number | undefined>(undefined);

  // Success info
  const [orderId, setOrderId] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  // UI
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nowServer = () => Date.now() + serverOffsetMs;
  const remainMs = useMemo(() => {
    if (!deadlineMs) return 0;
    return Math.max(0, deadlineMs - nowServer());
  }, [deadlineMs, serverOffsetMs]);

  const disableCreate =
    phase === "minting" || phase === "creating" || remainMs < 15_000;

  // --- Effects: init reservation + restore ---
  useEffect(() => {
    let mounted = true;
    if (!rid) return;

    (async () => {
      try {
        // Reservation
        const res = await apiGetReservation(rid);
        if (!mounted) return;
        setReservation(res);
        const offset = res.serverTime - Date.now();
        setServerOffsetMs(offset);

        // Restore buyer
        const storedBuyer = loadBuyerLocal(rid);
        if (storedBuyer) setBuyer(storedBuyer);

        // Restore TX (if any)
        const stored = loadTx(rid);
        if (stored?.transactionId) {
          setTx(stored);
          // Try to restore current state
          try {
            const st = await apiGetIntentByTx(stored.transactionId);
            if (!mounted) return;
            const exAt = toEpochMs(st.expiresAt);
            if (st.status === "PENDING") {
              if (st.ui && st.ui.kind === "qr") {
                setQrUrl(st.ui.url);
                setQrExpireMs(exAt);
                setPhase("awaiting");
                beginPolling(stored.transactionId);
              } else if (st.ui?.kind === "redirect") {
                // In redirect case, just keep polling
                setPhase("awaiting");
                beginPolling(stored.transactionId);
              } else {
                setPhase("awaiting");
                beginPolling(stored.transactionId);
              }
            } else if (st.status === "SUCCEEDED") {
              setOrderId(st.orderId || null);
              setClaimUrl(st.claim?.url || null);
              clearTx(rid);
              setPhase("success");
              stopPolling();
            } else {
              // FAILED / EXPIRED -> clear and stay idle (let user create again)
              clearTx(rid);
              setTx(null);
              setQrUrl(null);
              setPhase("idle");
            }
          } catch {
            // If cannot restore, clear
            clearTx(rid);
            setTx(null);
            setQrUrl(null);
            setPhase("idle");
          }
        }
      } catch (e: any) {
        const code = e?.code;
        if (code === 429) {
          const s = e?.retryAfterSec;
          setToast(`Please try again in ${s ?? "a few"} seconds`);
        } else {
          setToast("Unable to load reservation data.");
        }
      }
    })();

    return () => {
      mounted = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  // --- Polling helpers ---
  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function beginPolling(transactionId: string) {
    stopPolling();
    pollRef.current = setInterval(() => {
      pollOnce(transactionId);
    }, 1200);
  }

  async function pollOnce(transactionId: string) {
    try {
      const st = await apiGetIntentByTx(transactionId);
      if (st.status === "SUCCEEDED") {
        setOrderId(st.orderId || null);
        setClaimUrl(st.claim?.url || null);
        clearTx(rid);
        setPhase("success");
        stopPolling();
      } else if (st.status === "FAILED" || st.status === "EXPIRED") {
        setToast(
          st.status === "FAILED"
            ? "Payment failed."
            : "Transaction has expired."
        );
        clearTx(rid);
        setTx(null);
        setQrUrl(null);
        setPhase("idle");
        stopPolling();
      } else if (st.status === "PENDING") {
        // Keep waiting; update UI if server provides newer QR/expiresAt
        const exAt = toEpochMs(st.expiresAt);
        if (st.ui?.kind === "qr" && st.ui.url) {
          setQrUrl(st.ui.url);
          setQrExpireMs(exAt);
        }
      }
    } catch (e: any) {
      if (e?.code === 429) {
        const s = e?.retryAfterSec;
        setToast(`Rate limited. Try again in ${s ?? "a few"} seconds`);
      }
      // ignore transient errors
    }
  }

  // --- Actions ---
  async function onCreatePayment() {
    const v = validateBuyer(buyer);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    if (!reservation || !deadlineMs) {
      setToast("No reservation information available.");
      return;
    }

    // Ensure TTL remaining enough
    const remain = Math.max(0, deadlineMs - nowServer());
    if (remain < 15_000) {
      setToast("Reservation is expiring soon. Please try again.");
      return;
    }

    setPhase("minting");
    try {
      // 1) buyer-claim
      const bc = await apiPostBuyerClaim(rid, buyer);
      saveBuyerLocal(rid, buyer, remain);

      // 2) create intent
      setPhase("creating");
      const intentTtl = Math.min(Math.max(remain - 30_000, 0), 300_000);
      const intent = await apiPostCreateIntent({
        rid,
        buyerClaim: bc.buyerClaim,
        provider,
        ttlMs: intentTtl,
      });

      const exAt = toEpochMs(intent.expiresAt);

      // Save minimal tx
      const storedTx: StoredTx = {
        transactionId: intent.transactionId,
        paymentIntentID: intent.paymentIntentID,
        provider,
        expiresAt: exAt,
        ui: intent.ui,
      };
      saveTx(rid, storedTx);
      setTx(storedTx);

      if (intent.ui.kind === "qr") {
        setQrUrl(intent.ui.url);
        setQrExpireMs(exAt);
        setPhase("awaiting");
        beginPolling(intent.transactionId);
      } else if (intent.ui.kind === "redirect") {
        // Before leaving, ensure state saved
        setPhase("awaiting");
        // allow microtask flush
        setTimeout(() => {
          window.location.href =
            intent.ui.kind === "redirect" ? intent.ui.url : "/";
        }, 0);
      } else {
        setToast("This payment interface is not supported.");
        setPhase("idle");
      }
    } catch (e: any) {
      if (e?.code === 429) {
        const s = e?.retryAfterSec;
        setToast(`Please try again in ${s ?? "a few"} seconds`);
      } else {
        setToast("Unable to create payment code.");
      }
      setPhase("idle");
    }
  }

  function onCreateAgain() {
    // keep provider & buyer, just re-run
    onCreatePayment();
  }

  async function onCopyClaim() {
    if (!claimUrl) return;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setToast("Claim link copied to clipboard.");
    } catch {
      setToast("Cannot copy automatically. Please copy manually.");
    }
  }

  // Keep buyer validation in sync
  useEffect(() => {
    if (!buyer) return;
    setErrors(validateBuyer(buyer));
  }, [buyer]);

  // If reservation fully expired, optionally redirect away after a while
  useEffect(() => {
    if (remainMs <= 0 && phase !== "success") {
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainMs]);

  const criticalTTL = remainMs < 30_000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Secure Payment
              </h1>
              <p className="text-gray-600">
                Reservation ID:{" "}
                <span className="font-mono text-indigo-600 font-semibold">
                  #{rid}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* Timer Section */}
        <section className="flex justify-center mb-8">
          <Countdown targetMs={deadlineMs} />
        </section>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Reservation Summary */}
          {reservation?.lines?.length ? (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Reservation
                </h3>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="space-y-3">
                  {reservation.lines.map((l, idx) => (
                    <div
                      key={`${l.ttId}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <span className="text-gray-700 font-medium">
                          {l.title ?? l.ttId}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Qty:</span>
                        <span className="tabular-nums text-gray-900 font-bold text-lg">
                          {l.qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            {/* Success State */}
            {phase === "success" && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Payment Successful! 🎉
                  </h2>
                  <p className="text-gray-600">
                    Your payment has been processed successfully.
                  </p>
                  {orderId && (
                    <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Order ID:</span>{" "}
                        <span className="font-mono font-bold">{orderId}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {claimUrl ? (
                    <button
                      type="button"
                      onClick={onCopyClaim}
                      className="inline-flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Copy Claim Link</span>
                    </button>
                  ) : (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 text-center">
                      <p className="text-sm text-blue-800">
                        📧 Please check your email/SMS for ticket information.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="inline-flex items-center space-x-2 rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span>Back to Home</span>
                  </button>
                </div>
              </div>
            )}

            {/* QR Code Display */}
            {phase === "awaiting" && qrUrl && (
              <QrPanel
                qrUrl={qrUrl}
                deadlineMs={deadlineMs}
                qrExpireMs={qrExpireMs}
                onCheck={() => {
                  if (tx?.transactionId) pollOnce(tx.transactionId);
                }}
              />
            )}

            {/* Form and Payment Method Selection */}
            {phase !== "success" && phase !== "awaiting" && (
              <div className="space-y-8">
                <ContactForm
                  buyer={buyer}
                  setBuyer={setBuyer}
                  disabled={phase === "minting" || phase === "creating"}
                  errors={errors}
                />

                <ProviderPicker
                  value={provider}
                  onChange={setProvider}
                  disabled={phase === "minting" || phase === "creating"}
                />

                {/* Action Button */}
                <div className="flex flex-col items-center space-y-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onCreatePayment}
                    disabled={disableCreate || Object.keys(errors).length > 0}
                    className={classNames(
                      "relative inline-flex items-center justify-center space-x-3 rounded-2xl px-8 py-4 text-base font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 transform",
                      disableCreate || Object.keys(errors).length > 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 hover:scale-105 active:scale-95"
                    )}
                  >
                    {phase === "minting" || phase === "creating" ? (
                      <>
                        <svg
                          className="animate-spin w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Creating Payment...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>Generate Payment Code</span>
                      </>
                    )}
                  </button>

                  {remainMs < 15_000 && (
                    <div className="bg-red-50 rounded-2xl p-4 border border-red-200 text-center">
                      <p className="text-sm text-red-700 font-medium">
                        ⚠️ Cannot create payment when time remaining is less
                        than 15 seconds
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Retry Button for Failed States */}
            {phase === "idle" &&
              tx === null &&
              qrUrl === null &&
              reservation && (
                <div className="text-center pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onCreateAgain}
                    disabled={disableCreate || Object.keys(errors).length > 0}
                    className={classNames(
                      "inline-flex items-center space-x-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200",
                      disableCreate || Object.keys(errors).length > 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg"
                    )}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Retry Payment</span>
                  </button>
                  {remainMs < 15_000 && (
                    <p className="text-sm text-red-600 mt-2">
                      TTL too low — need to make a new reservation.
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Footer Note */}
        <footer className="text-center mt-8">
          <p className="text-xs text-gray-500 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            🔐 <strong>Secure & Private:</strong> No personal information is
            logged. Countdown synced with server time to prevent clock drift.
          </p>
        </footer>

        {/* Toast */}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </main>
    </div>
  );
}
