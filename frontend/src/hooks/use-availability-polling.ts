import { useEffect, useRef, useState } from "react";

type AvailabilityItem = {
  ticketTypeId: string;
  remaining: number;
  isSoldOut: boolean;
};
type Result = {
  loading: boolean;
  error?: string;
  data: AvailabilityItem[] | null;
};

export function useAvailabilityPolling(
  slug: string,
  {
    baseIntervalMs = 12_000, // 10–15s
    enabled = true,
  }: { baseIntervalMs?: number; enabled?: boolean } = {}
): Result {
  const [data, setData] = useState<AvailabilityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const etagRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef<boolean>(
    typeof document === "undefined" ? true : !document.hidden
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      const onVis = () => {
        visibleRef.current = !document.hidden;
      };
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !slug) return;
    let stopped = false;

    const jitter = () => Math.floor((Math.random() - 0.5) * 2000); // ±1–2s
    const schedule = () => {
      if (stopped) return;
      const next = baseIntervalMs + jitter();
      timerRef.current = setTimeout(tick, Math.max(5000, next));
    };

    const tick = async () => {
      if (stopped) return;
      if (!visibleRef.current) {
        schedule();
        return;
      }

      try {
        const res = await fetch(
          `/api/proxy/public/availability?slug=${encodeURIComponent(slug)}`,
          {
            method: "GET",
            headers: etagRef.current
              ? { "If-None-Match": etagRef.current }
              : {},
            cache: "no-store",
          }
        );

        if (res.status === 304) {
          schedule();
          return;
        }

        if (res.status === 410) {
          // cancelled
          setError("CANCELLED");
          setData(null);
          setLoading(false);
          return; // dừng hẳn (tuỳ bạn muốn dừng)
        }

        if (res.status === 404) {
          setError("NOT_FOUND");
          setData(null);
          setLoading(false);
          return; // dừng (tuỳ)
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const et = res.headers.get("ETag") ?? undefined;
        etagRef.current = et;

        const body = await res.json();
        setData(body || []);
        setError(undefined);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Fetch error");
      } finally {
        schedule();
      }
    };

    setLoading(true);
    tick();

    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slug, enabled, baseIntervalMs]);

  return { loading, error, data };
}
