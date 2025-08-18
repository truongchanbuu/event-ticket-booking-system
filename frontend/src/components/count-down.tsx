import { classNames } from "@/lib/components/classname-utils";
import { msToMMSS } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export function Countdown({
  targetMs,
  altTargetMs,
  offsetMs = 0,
}: {
  targetMs?: number | null;
  /** If provided, countdown to min(targetMs, altTargetMs) */
  altTargetMs?: number;
  offsetMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const effectiveTarget = useMemo(() => {
    const a = typeof targetMs === "number" ? targetMs : undefined;
    const b = typeof altTargetMs === "number" ? altTargetMs : undefined;
    if (!a && !b) return undefined;
    return a && b ? Math.min(a, b) : (a ?? b);
  }, [targetMs, altTargetMs]);

  if (!effectiveTarget) {
    return <span className="tabular-nums">--:--</span>;
  }

  const nowAdj = now + offsetMs;
  const left = Math.max(0, (effectiveTarget ?? 0) - nowAdj);
  const critical = left <= 30_000;

  return (
    <div className="flex items-center justify-center p-2 space-x-3">
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
