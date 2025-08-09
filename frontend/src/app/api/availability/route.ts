// app/api/availability/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTREAM =
  process.env.AVAILABILITY_SERVICE_URL || process.env.EVENT_SERVICE_URL;

const EDGE_TTL = Number(process.env.AVAIL_EDGE_TTL_SEC || "0");

const inflight = new Map<string, Promise<Response>>();
const COALESCE_MS = 150;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeEtag(payload: any) {
  // đơn giản: hash theo remaining+status+lastUpdatedAt
  const base = `${payload?.remaining ?? ""}:${payload?.status ?? ""}:${payload?.lastUpdatedAt ?? ""}`;
  // weak etag
  return `W/"${base}"`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId)
    return NextResponse.json({ message: "Missing eventId" }, { status: 400 });

  // coalescing key
  const key = `avail:${eventId}`;

  // nếu đã có fetch đang bay → chờ cùng promise
  if (inflight.has(key)) {
    try {
      return await inflight.get(key)!.then((r) => r.clone());
    } catch {
      // fallthrough để fetch mới
    }
  }

  // đợi ngắn để gom nhiều request cùng lúc
  const waiter = (async () => {
    await sleep(COALESCE_MS);
    // gọi upstream
    const upstreamUrl = `${UPSTREAM}/availability?eventId=${encodeURIComponent(eventId)}`;
    const up = await fetch(upstreamUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const rawText = await up.text();
    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { message: rawText || up.statusText };
    }

    // 410/404/200 → pass-through status
    const headers: Record<string, string> = {};

    // ETag: chỉ set khi 200
    if (up.status === 200) {
      const etag = makeEtag(json);
      headers["ETag"] = etag;

      // If-None-Match support
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        const resp = new NextResponse(null, {
          status: 304,
          headers:
            EDGE_TTL > 0
              ? {
                  "Cache-Control": `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=5`,
                }
              : { "Cache-Control": "no-store" },
        });
        return resp;
      }
    }

    headers["Cache-Control"] =
      EDGE_TTL > 0
        ? `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=5`
        : "no-store";

    return NextResponse.json(json, { status: up.status, headers });
  })();

  inflight.set(key, waiter);

  try {
    const resp = await waiter;
    return resp.clone();
  } finally {
    inflight.delete(key);
  }
}
