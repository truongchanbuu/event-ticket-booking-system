import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVICE_TOKEN = process.env.EVENT_SERVICE_TOKEN;
const BASE = process.env.EVENT_SERVICE_URL;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 2500);

  try {
    const upstream = await fetch(`${BASE}/events/${slug}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(SERVICE_TOKEN ? { authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
      },
    });

    console.log(`up: ${upstream}`);

    const text = await upstream.text();
    const json = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return { message: text || upstream.statusText };
      }
    })();

    if (upstream.status === 200) {
      return NextResponse.json(json, { status: 200 });
    }
    if (upstream.status === 404)
      return NextResponse.json(json, { status: 404 });
    if (upstream.status === 410)
      return NextResponse.json(json, { status: 410 });

    return NextResponse.json(
      { message: "Upstream error", status: upstream.status },
      { status: 502 }
    );
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
    }
    return NextResponse.json({ message: "Proxy error" }, { status: 502 });
  } finally {
    clearTimeout(to);
  }
}
