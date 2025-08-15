import { useEffect, useRef, useState } from "react";

type AvailabilityItem = {
  ticketTypeId: string;
  remaining: number;
  isSoldOut: boolean;
};

type Result = {
  loading: boolean;
  error?: "CANCELLED" | "NOT_FOUND" | string;
  data: AvailabilityItem[] | null;
};

export function useAvailabilityPolling(
  slug: string,
  {
    baseIntervalMs = 12_000, // 10–15s
    enabled = true,
    etag, // <-- NHẬN ETag từ SSE/parent
  }: { baseIntervalMs?: number; enabled?: boolean; etag?: string | null } = {}
): Result {
  const [data, setData] = useState<AvailabilityItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Result["error"]>(undefined);

  const etagRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef<boolean>(
    typeof document === "undefined" ? true : !document.hidden
  );

  // Đồng bộ ETag từ props (SSE) vào etagRef để dùng làm If-None-Match
  useEffect(() => {
    etagRef.current = etag ?? undefined;
  }, [etag]);

  // Theo dõi visibility để tạm ngưng khi tab ẩn
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
    let ctrl: AbortController | null = null;

    const jitter = () => Math.floor((Math.random() - 0.5) * 2000); // ± ~1s
    const schedule = () => {
      if (stopped) return;
      const next = Math.max(5000, baseIntervalMs + jitter());
      timerRef.current = setTimeout(tick, next);
    };

    const tick = async () => {
      if (stopped) return;
      if (!visibleRef.current) {
        schedule();
        return;
      }

      ctrl = new AbortController();

      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers["If-None-Match"] = etagRef.current;

        const res = await fetch(
          `/api/proxy/public/availability?slug=${encodeURIComponent(slug)}`,
          { method: "GET", headers, cache: "no-store", signal: ctrl.signal }
        );

        if (res.status === 304) {
          // Không đổi dữ liệu → coi như OK, hạ loading nếu đang true
          setLoading(false);
          setError(undefined);
          schedule();
          return;
        }

        if (res.status === 410) {
          setError("CANCELLED");
          setData(null);
          setLoading(false);
          stopped = true; // dừng hẳn polling
          return;
        }

        if (res.status === 404) {
          setError("NOT_FOUND");
          setData(null);
          setLoading(false);
          stopped = true; // dừng hẳn polling
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Cập nhật ETag mới (nếu có) để vòng sau gửi If-None-Match
        const et = res.headers.get("ETag") ?? undefined;
        etagRef.current = et;

        const body = (await res.json()) as AvailabilityItem[] | null;
        setData(Array.isArray(body) ? body : []);
        setError(undefined);
        setLoading(false);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Fetch error");
      } finally {
        if (!stopped) schedule();
      }
    };

    // Lần đầu: bật loading & tick ngay
    setLoading(true);
    setError(undefined);
    tick();

    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        ctrl?.abort();
      } catch {}
    };
  }, [slug, enabled, baseIntervalMs]);

  return { loading, error, data };
}
