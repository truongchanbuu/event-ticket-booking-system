import { NextResponse } from "next/server";
export const runtime = "nodejs";
const AVAIL =
  process.env.AVAILABILITY_SERVICE_URL || process.env.EVENT_SERVICE_URL!;
const SERVICE_TOKEN = process.env.EVENT_SERVICE_TOKEN;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId)
    return NextResponse.json({ message: "Missing eventId" }, { status: 400 });

  const r = await fetch(
    `${AVAIL}/availability?eventId=${encodeURIComponent(eventId)}`,
    {
      headers: {
        accept: "application/json",
        ...(SERVICE_TOKEN ? { authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
      },
      cache: "no-store",
    }
  );

  // availability thường không có 410, nhưng nếu upstream trả thì pass-through luôn
  return NextResponse.json(
    r.ok ? await r.json() : { message: (await r.text()) || "Upstream error" },
    { status: r.status, headers: { "Cache-Control": "no-store" } }
  );
}
