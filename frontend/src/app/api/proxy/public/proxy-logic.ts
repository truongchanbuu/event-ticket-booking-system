import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const registry = {
  users: process.env.USER_SERVICE_URL,
  tickets: process.env.TICKET_SERVICE_URL,
  organizers: process.env.USER_SERVICE_URL,
  events: process.env.EVENT_SERVICE_URL,
  checkout: process.env.BOOKING_SERVICE_URL,
  reservations: process.env.BOOKING_SERVICE_URL,
  availability: process.env.EVENT_SERVICE_URL,
  auth: process.env.AUTH_SERVICE_URL,
  media: process.env.MEDIA_SERVICE_URL,
  payment: process.env.PAYMENT_SERVICE_URL,
};

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

function sanitizeHeaders(h: Headers) {
  const out = new Headers();
  h.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.set(k, v);
  });
  return out;
}

export async function handler(
  req: NextRequest,
  ctx: { params: { service: string; path?: string[] } }
) {
  const { service, path = [] } = ctx.params;
  const base = registry[service as keyof typeof registry];
  if (!base)
    return NextResponse.json({ message: "Service not found" }, { status: 404 });

  // Build URL an toàn (giữ query)
  const target = new URL(base!);
  const segs = [target.pathname.replace(/\/+$/, ""), service, ...path].filter(
    Boolean
  );
  target.pathname = segs.join("/").replace(/\/{2,}/g, "/");
  target.search = req.nextUrl.search; // <-- giữ nguyên query

  // Timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  // Body streaming (Node runtime)
  const method = req.method.toUpperCase();
  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const headers = sanitizeHeaders(req.headers);

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      signal: ctrl.signal,
      ...(hasBody
        ? {
            body: req.body, // ReadableStream
            // @ts-ignore Node fetch streaming
            duplex: "half",
          }
        : {}),
      cache: "no-store",
    });

    // Trả nguyên stream & header (đã loại hop-by-hop ở trên)
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: sanitizeHeaders(upstream.headers),
    });
  } catch (err: any) {
    const code = err?.name === "AbortError" ? 504 : 502;
    return NextResponse.json(
      { message: code === 504 ? "Gateway timeout" : "Proxy error" },
      { status: code }
    );
  } finally {
    clearTimeout(t);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
