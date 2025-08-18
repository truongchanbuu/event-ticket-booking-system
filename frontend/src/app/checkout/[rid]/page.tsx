"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { safeParseJSON, toEpochMs } from "@/lib/utils";
import { Countdown } from "@/components/count-down";
import {
  Buyer,
  IntentResp,
  Phase,
  Provider,
  ReservationResp,
  StoredBuyer,
  StoredTx,
} from "@/schema";
import { classNames } from "@/lib/components/classname-utils";
import {
  apiGetIntentByTx,
  apiGetReservation,
  apiPostBuyerClaim,
  apiPostCreateIntent,
} from "@/lib/api/payment/api";
import { validateBuyer } from "@/lib/payment/payment.validator";
import { ContactForm } from "@/components/payment/contact-form";
import { ProviderPicker } from "@/components/payment/provider-picker";
import { QrPanel } from "@/components/payment/qr-panel";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/user-store-hooks";

/** =======================
 * Storage helpers (sessionStorage)
 * ======================= */

const buyerKey = (rid: string) => `rid:${rid}:buyer`;
const txKey = (rid: string) => `rid:${rid}:tx`;

function saveBuyerLocal(rid: string, buyer: Buyer, ttlMs: number) {
  if (typeof window === "undefined") return;
  const expAt = Date.now() + Math.max(0, ttlMs);
  const payload: StoredBuyer = { buyer, expAt };
  sessionStorage.setItem(buyerKey(rid), JSON.stringify(payload));
}
function loadBuyerLocal(rid: string): Buyer | null {
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
function saveTx(rid: string, tx: StoredTx) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(txKey(rid), JSON.stringify(tx));
}
function loadTx(rid: string): StoredTx | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(txKey(rid));
  const parsed = safeParseJSON<StoredTx>(raw);
  return parsed || null;
}
function clearTx(rid: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(txKey(rid));
}

/** =======================
 * Page
 * ======================= */
export default function Page() {
  const params = useParams<{ rid: string }>();
  const rid = String(params?.rid || "");
  const router = useRouter();

  const initialTxRef = React.useRef<StoredTx | null>(
    typeof window !== "undefined" && rid ? loadTx(rid) : null
  );

  const userProfile = useUserProfile();
  const initialPrefillDoneRef = useRef(false);

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
    const expAtNum = toEpochMs((reservation as any).expiresAt);
    const calc = reservation.serverTime + reservation.ttlMs;
    return expAtNum ? Math.min(expAtNum, calc) : calc;
  }, [reservation]);
  const nowServer = () => Date.now() + serverOffsetMs;
  const remainMs = useMemo(() => {
    if (!deadlineMs) return 0;
    return Math.max(0, deadlineMs - nowServer());
  }, [deadlineMs, serverOffsetMs]);

  // Intent / TX
  const [tx, setTx] = useState<StoredTx | null>(initialTxRef.current);
  const [qrPayload, setQrPayload] = useState<string | null>(
    initialTxRef.current?.qrPayload ?? null
  );
  const [qrExpireMs, setQrExpireMs] = useState<number | undefined>(
    initialTxRef.current?.expiresAt
  );
  const [phase, setPhase] = useState<Phase>(
    initialTxRef.current?.qrPayload ? "awaiting" : "idle"
  );

  const [provider, setProvider] = useState<Provider>(
    (initialTxRef.current?.provider as Provider) || "momo"
  );

  // Success info
  const [orderId, setOrderId] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  // UI
  const { toast: globalToast } = useToast();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      globalToast({ variant: "default", title: toast });
      setToast(null);
    }
  }, [toast, globalToast]);

  const disableCreate =
    phase === "minting" || phase === "creating" || remainMs < 15_000;

  // Prefill buyer lần đầu
  useEffect(() => {
    if (!rid || initialPrefillDoneRef.current) return;

    const storedBuyer = loadBuyerLocal(rid);
    if (storedBuyer) {
      setBuyer(storedBuyer);
      initialPrefillDoneRef.current = true;
      return;
    }
    if (userProfile) {
      setBuyer((prev) => {
        const next = {
          email: prev.email || (userProfile.email as string) || "",
          phone: prev.phone || (userProfile.phoneNumber as string) || "",
          name: prev.name || (userProfile.username as string) || "",
          userId: prev.userId || (userProfile.userID as string) || undefined,
        } as Buyer;
        return next;
      });
      initialPrefillDoneRef.current = true;
    }
  }, [rid, userProfile]);

  // Sync buyer khi userProfile đổi
  useEffect(() => {
    if (!userProfile) return;
    setBuyer((prev) => {
      let changed = false;
      const next = { ...prev };
      if (userProfile.userID && !next.userId) {
        next.userId = userProfile.userID as string;
        changed = true;
      }
      if (!next.email && userProfile.email) {
        next.email = userProfile.email as string;
        changed = true;
      }
      if (!next.phone && userProfile.phoneNumber) {
        next.phone = userProfile.phoneNumber as string;
        changed = true;
      }
      const profName = (userProfile.username as string) || "";
      if (!next.name && profName) {
        next.name = profName;
        changed = true;
      }
      return changed ? (next as Buyer) : prev;
    });
  }, [
    userProfile?.email,
    userProfile?.phoneNumber,
    userProfile?.username,
    userProfile?.userID,
  ]);

  // ===== Polling with backoff/jitter =====
  type PollState = {
    timer: ReturnType<typeof setTimeout> | null;
    stopped: boolean;
    attempt: number;
    pending: boolean;
  };
  const pollRef = useRef<PollState>({
    timer: null,
    stopped: true,
    attempt: 0,
    pending: false,
  });

  function nextDelayMs(attempt: number, retryAfterSec?: number) {
    if (retryAfterSec && retryAfterSec > 0) return retryAfterSec * 1000;
    const BASE = 1000;
    const FACTOR = 1.6;
    const MAX = 15000;
    const raw = Math.min(
      MAX,
      Math.round(BASE * Math.pow(FACTOR, Math.max(0, attempt)))
    );
    const jitter = Math.round(raw * (0.2 * Math.random() - 0.1)); // ±10%
    return Math.max(800, raw + jitter);
  }
  function stopPolling() {
    const s = pollRef.current;
    s.stopped = true;
    s.pending = false;
    if (s.timer) clearTimeout(s.timer);
    s.timer = null;
  }
  async function pollTick(transactionId: string) {
    const s = pollRef.current;
    if (s.stopped || s.pending) return;

    if (typeof document !== "undefined" && document.hidden) {
      s.timer = setTimeout(() => pollTick(transactionId), 5000);
      return;
    }

    s.pending = true;
    try {
      const st: any = await apiGetIntentByTx(transactionId);
      const status: string = st?.status;
      const exAt = toEpochMs(st?.expiresAt);
      const ui: any = st?.ui;

      if (status === "SUCCEEDED") {
        setOrderId(st?.orderId || null);
        setClaimUrl(st?.claim?.url || null);
        clearTx(rid);
        setPhase("success");
        stopPolling();
        return;
      }

      if (status === "FAILED" || status === "EXPIRED") {
        setToast(
          status === "FAILED" ? "Payment failed." : "Transaction has expired."
        );
        clearTx(rid);
        setTx(null);
        setQrPayload(null);
        setPhase("idle");
        stopPolling();
        return;
      }

      // PENDING
      if (typeof exAt === "number") setQrExpireMs(exAt);

      if (ui?.kind === "qr") {
        const payload: string | null = ui?.payload ?? ui?.url ?? null;

        if (payload) {
          setQrPayload(payload);
          if (typeof exAt === "number") setQrExpireMs(exAt);
          setTx((prev) => {
            if (!prev) return prev;
            const next: StoredTx = {
              ...prev,
              ...(typeof exAt === "number" ? { expiresAt: exAt } : {}),
              ui,
              qrPayload: payload,
            };
            saveTx(rid, next);
            return next;
          });
        } else {
          // Không có payload mới ⇒ chỉ cập nhật expiresAt nếu có
          setTx((prev) => {
            if (!prev) return prev;
            if (typeof exAt !== "number") return prev;
            const next: StoredTx = { ...prev, expiresAt: exAt };
            saveTx(rid, next);
            return next;
          });
        }
      } else {
        // Không có ui hoặc ui không phải QR ⇒ giữ nguyên QR cũ, chỉ cập nhật expiresAt nếu có
        setTx((prev) => {
          if (!prev) return prev;
          if (typeof exAt !== "number") return prev;
          const next: StoredTx = { ...prev, expiresAt: exAt };
          saveTx(rid, next);
          return next;
        });
      }

      // Đảm bảo vẫn ở trạng thái awaiting trong khi PENDING
      setPhase("awaiting");

      s.attempt += 1;
      const delay = nextDelayMs(s.attempt);
      s.pending = false;
      s.timer = setTimeout(() => pollTick(transactionId), delay);
    } catch (e: any) {
      let delaySec = 0;
      if (e?.code === 429 && typeof e?.retryAfterSec === "number") {
        delaySec = e.retryAfterSec;
      }
      s.attempt += 1;
      const delay = nextDelayMs(s.attempt, delaySec);
      s.pending = false;
      s.timer = setTimeout(() => pollTick(transactionId), delay);
    }
  }

  function beginPolling(transactionId: string) {
    stopPolling();
    const s = pollRef.current;
    s.stopped = false;
    s.attempt = 0;
    s.pending = false;
    s.timer = setTimeout(() => pollTick(transactionId), 0); // fast-first
  }
  function nudgePolling(transactionId: string) {
    const s = pollRef.current;
    if (s.stopped) return;
    s.attempt = 0;
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(() => pollTick(transactionId), 0);
  }
  useEffect(() => () => stopPolling(), []);

  // Load reservation trước, sau đó khôi phục TX từ local và đồng bộ
  useEffect(() => {
    let mounted = true;
    if (!rid) return;

    (async () => {
      try {
        // 1) luôn load reservation
        const res = await apiGetReservation(rid);
        if (!mounted) return;

        setReservation(res);
        setServerOffsetMs(res.serverTime - Date.now());

        const storedBuyer = loadBuyerLocal(rid);
        if (storedBuyer) setBuyer(storedBuyer);

        // 2) khôi phục TX (nếu có)
        const storedTx0 = loadTx(rid);
        const now = Date.now() + (res.serverTime - Date.now());

        if (storedTx0?.expiresAt && now >= storedTx0.expiresAt) {
          clearTx(rid);
        } else if (storedTx0?.transactionId) {
          setTx(storedTx0);

          // hiển thị nhanh QR từ local
          if (storedTx0.ui?.kind === "qr" && storedTx0.qrPayload) {
            setQrPayload(storedTx0.qrPayload);
            setQrExpireMs(storedTx0.expiresAt);
            setPhase("awaiting");
          }

          // 3) đồng bộ trạng thái từ BE

          try {
            const st = await apiGetIntentByTx(storedTx0.transactionId);
            if (!mounted) return;

            const exAt = toEpochMs((st as any).expiresAt);
            const status = (st as any).status;
            const ui: any = (st as any).ui;

            if (status === "PENDING") {
              if (typeof exAt === "number") setQrExpireMs(exAt);

              // chỉ overwrite khi có ui QR hợp lệ
              if (ui?.kind === "qr") {
                const payload = ui?.payload ?? ui?.url ?? null;
                if (payload) {
                  setQrPayload(payload);
                  setTx((prev) => {
                    if (!prev) return prev;
                    const next: StoredTx = {
                      ...prev,
                      ...(typeof exAt === "number" ? { expiresAt: exAt } : {}),
                      ui,
                      qrPayload: payload,
                    };
                    saveTx(rid, next);
                    return next;
                  });
                } else {
                  // không có payload mới → chỉ update expiresAt nếu có
                  setTx((prev) => {
                    if (!prev || typeof exAt !== "number") return prev;
                    const next: StoredTx = { ...prev, expiresAt: exAt };
                    saveTx(rid, next);
                    return next;
                  });
                }
              } else {
                // không có ui hoặc không phải qr → giữ QR cũ, chỉ update expiresAt
                setTx((prev) => {
                  if (!prev || typeof exAt !== "number") return prev;
                  const next: StoredTx = { ...prev, expiresAt: exAt };
                  saveTx(rid, next);
                  return next;
                });
              }

              setPhase("awaiting");
              beginPolling(storedTx0.transactionId);
            } else if (status === "SUCCEEDED") {
              setOrderId((st as any).orderId || null);
              setClaimUrl((st as any).claim?.url || null);
              clearTx(rid);
              setPhase("success");
              stopPolling();
            } else {
              // FAILED / EXPIRED
              clearTx(rid);
              setTx(null);
              setQrPayload(null);
              setPhase("idle");
            }
          } catch {
            // ⚠️ ĐỪNG clear – giữ QR cũ & tiếp tục polling
            setToast("Cannot sync payment status right now. Retrying…");
            if (storedTx0?.transactionId) {
              setPhase("awaiting");
              beginPolling(storedTx0.transactionId);
            }
          }
        }
      } catch (e: any) {
        // Lỗi load reservation
        if (e?.code === 429) {
          const s = e?.retryAfterSec;
          setToast(`Please try again in ${s ?? "a few"} seconds`);
        } else {
          setToast("Unable to load reservation data. Returning…");
          setTimeout(() => router.back(), 1200);
        }
      }
    })();

    return () => {
      mounted = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, router]);

  // Reservation hết hạn ⇒ toast + back
  useEffect(() => {
    if (deadlineMs && remainMs <= 0 && phase !== "success") {
      setToast("Reservation expired. Returning…");
      const t = setTimeout(() => router.back(), 1200);
      return () => clearTimeout(t);
    }
  }, [deadlineMs, remainMs, phase, router]);

  // Validate buyer theo state
  useEffect(() => {
    if (!buyer) return;
    setErrors(validateBuyer(buyer));
  }, [buyer]);

  // --- Actions ---
  async function onCreatePayment() {
    const v = validateBuyer(buyer);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    if (!reservation || !deadlineMs) {
      setToast("No reservation information available.");
      return;
    }

    const remain = Math.max(0, deadlineMs - nowServer());
    if (remain < 15_000) {
      setToast("Reservation is expiring soon. Please try again.");
      return;
    }

    setPhase("minting");
    try {
      // 1) buyer-claim
      const bc: any = await apiPostBuyerClaim(rid, buyer);
      saveBuyerLocal(rid, buyer, remain);

      // 2) create intent
      setPhase("creating");
      const intentTtl = Math.min(Math.max(remain - 30_000, 0), 300_000);
      const intent: IntentResp = await apiPostCreateIntent({
        rid,
        buyerClaim: {
          fullName: bc?.claim?.buyer?.fullName ?? buyer.name ?? null,
          name: buyer.name ?? undefined,
          email: bc?.claim?.buyer?.email ?? buyer.email ?? null,
          phone: bc?.claim?.buyer?.phone ?? buyer.phone ?? null,
          note: bc?.claim?.buyer?.note ?? null,
          extra: bc?.claim?.buyer?.extra ?? null,
          userId: bc?.claim?.userId ?? buyer.userId ?? undefined,
        } as any,
        provider,
        ttlMs: intentTtl,
      } as any);

      const exAt = toEpochMs((intent as any).expiresAt);
      const ui = (intent as any).ui as any;

      const storedTx: StoredTx = {
        transactionId: (intent as any).transactionId,
        paymentIntentID: (intent as any).paymentIntentID,
        provider,
        expiresAt: exAt,
        ui,
        qrPayload: ui?.kind === "qr" ? (ui.payload ?? ui.url ?? null) : null,
      };
      saveTx(rid, storedTx);
      setTx(storedTx);

      if (ui?.kind === "qr") {
        setQrPayload(storedTx?.qrPayload);
        setQrExpireMs(exAt);
        setPhase("awaiting");
        beginPolling((intent as any).transactionId);
      } else if (ui?.kind === "redirect") {
        setPhase("awaiting");
        setTimeout(() => {
          window.location.href = ui.url || "/";
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

        {/* Timer */}
        <section className="flex justify-center mb-8">
          <Countdown targetMs={deadlineMs} offsetMs={serverOffsetMs} />
        </section>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Reservation Summary */}
          {reservation?.lines?.length ? (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full" />
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
                        <div className="w-2 h-2 bg-indigo-400 rounded-full" />
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
            {/* Success */}
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

            {/* Awaiting + QR */}
            {phase === "awaiting" && qrPayload && (
              <QrPanel
                qrPayload={qrPayload}
                qrExpireMs={qrExpireMs}
                offsetMs={serverOffsetMs}
                onCheck={() =>
                  tx?.transactionId && nudgePolling(tx.transactionId)
                }
                providerLabel={provider.toUpperCase()}
              />
            )}

            {/* Form + Provider + CTA */}
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
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                          />
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

                  {criticalTTL && (
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

            {/* Retry button */}
            {phase === "idle" &&
              tx === null &&
              qrPayload === null &&
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
                  {criticalTTL && (
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
      </main>
    </div>
  );
}
