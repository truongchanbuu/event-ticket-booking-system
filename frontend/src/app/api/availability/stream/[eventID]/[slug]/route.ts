import { NextRequest } from "next/server";

export const dynamic = "force-dynamic"; // tắt static opt
export const runtime = "nodejs"; // cần Node runtime cho stream

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; eventID: string }> }
) {
  const { slug, eventID } = await params;
  console.log(`slug: ${slug} - ${eventID}`);
  if (!slug) return new Response("Missing slug", { status: 400 });

  const upstream = process.env.EVENT_SERVICE_URL!;

  const upstreamRes = await fetch(
    `${upstream}/events/${eventID}/availability/stream/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      headers: {
        "Last-Event-ID": req.headers.get("last-event-id") ?? "",
        "x-user-id": req.headers.get("x-user-id") ?? "",
      },
    }
  );

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response("Upstream SSE error", { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  return new Response(upstreamRes.body, { status: 200, headers });
}
