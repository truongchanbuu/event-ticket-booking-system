import { useMemo, useState } from "react";
import { Countdown } from "../count-down";
import CustomQRCode from "./qr-code";

export function QrPanel({
  // ✅ mới: chuỗi để encode QR (ưu tiên dùng)
  qrPayload,
  // (tuỳ chọn) URL ảnh QR nếu BE trả sẵn ảnh
  qrUrlImage,
  deadlineMs,
  qrExpireMs,
  offsetMs = 0,
  onCheck,
  providerLabel = "MoMo",
  checkingExternal = false,
}: {
  qrPayload?: string;
  qrUrlImage?: string;
  deadlineMs?: number;
  qrExpireMs?: number;
  offsetMs?: number;
  onCheck: () => void;
  providerLabel?: string;
  checkingExternal?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [checking, setChecking] = useState(false);

  const nowServer = () => Date.now() + (offsetMs ?? 0);
  const isQrExpired = useMemo(
    () => (qrExpireMs ? nowServer() >= qrExpireMs : false),
    [qrExpireMs, offsetMs]
  );

  const isBusy = checking || checkingExternal;

  async function handleCheck() {
    if (isBusy) return;
    try {
      setChecking(true);
      await Promise.resolve(onCheck());
    } finally {
      setTimeout(() => setChecking(false), 500); // debounce nhẹ
    }
  }

  const showQrSvg = !!qrPayload && !isQrExpired;
  const showQrImg = !qrPayload && !!qrUrlImage && !imgError && !isQrExpired;

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-3xl p-8 border border-pink-100 shadow-lg">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">
              Scan to Pay with {providerLabel}
            </h3>
            <p className="text-gray-600">
              Open {providerLabel} app and scan this QR code to complete payment
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-300 to-purple-300 rounded-3xl blur opacity-20 animate-pulse"></div>

              <div className="relative bg-white p-6 rounded-3xl shadow-xl border-4 border-white min-w-[16rem]">
                {showQrSvg ? (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <CustomQRCode
                      size={200}
                      value={qrPayload!}
                      className="rounded-2xl border border-gray-300"
                    />
                  </div>
                ) : showQrImg ? (
                  <img
                    src={qrUrlImage}
                    alt={`${providerLabel} payment QR code`}
                    className="w-64 h-64 object-contain select-none rounded-2xl border border-gray-300"
                    decoding="async"
                    loading="eager"
                    draggable={false}
                    onError={() => setImgError(true)}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-gray-500 text-sm">
                    {isQrExpired
                      ? "QR expired — please check again"
                      : "QR unavailable"}
                  </div>
                )}

                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-gray-900/10"></div>
              </div>
            </div>
          </div>

          {/* Timers */}
          <div className="grid gap-3">
            {qrExpireMs ? (
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">
                  QR Expires In
                </span>
                <Countdown targetMs={qrExpireMs} offsetMs={offsetMs ?? 0} />
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCheck}
              disabled={isBusy}
              aria-busy={isBusy}
              className={[
                "inline-flex items-center justify-center space-x-3 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform",
                isBusy
                  ? "bg-gray-300 cursor-wait"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105",
              ].join(" ")}
            >
              {isBusy ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
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
                  <span>Checking…</span>
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>I’ve Paid / Check Status</span>
                </>
              )}
            </button>

            {isQrExpired && (
              <p
                className="text-xs text-red-600"
                role="status"
                aria-live="polite"
              >
                QR has expired — press “Check Status” to refresh.
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            💡 <strong>How to pay:</strong> Open {providerLabel} → “Scan QR” →
            Point camera → Confirm payment
          </div>
        </div>
      </div>
    </div>
  );
}
