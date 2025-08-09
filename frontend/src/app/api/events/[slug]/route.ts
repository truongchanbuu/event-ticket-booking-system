// app/api/events/[slug]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const BASE = process.env.EVENT_SERVICE_URL!;
const SERVICE_TOKEN = process.env.EVENT_SERVICE_TOKEN;

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
      headers: {
        accept: "application/json",
        ...(SERVICE_TOKEN ? { authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
      },
      next: { revalidate: 60 },
    });

    const bodyText = await upstream.text();
    const tryJson = () => {
      try {
        return JSON.parse(bodyText);
      } catch {
        return { message: bodyText || upstream.statusText };
      }
    };

    if (upstream.status === 200) {
      return NextResponse.json(tryJson(), {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      });
    }
    if (upstream.status === 404) {
      return NextResponse.json(tryJson(), { status: 404 });
    }
    if (upstream.status === 410) {
      return NextResponse.json(tryJson(), { status: 410 });
    }

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
