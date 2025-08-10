import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL!;

function filter(h: Headers) {
  const hop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
  ]);
  const out = new Headers();
  h.forEach((v, k) => {
    if (!hop.has(k.toLowerCase())) out.set(k, v);
  });
  return out;
}

async function optionalUserHeaders(token?: string) {
  if (!token) return undefined;
  try {
    initializeFirebaseAdmin();
    const d = await getAuth().verifyIdToken(token);
    const h = new Headers();
    h.set("x-user-id", d.uid);
    h.set("x-user-email", d.email || "");
    return h;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.nextUrl);
  const token =
    url.searchParams.get("token") ||
    (await cookies()).get("__session")?.value ||
    req.headers.get("authorization")?.split("Bearer ")[1];

  const userHeaders = await optionalUserHeaders(token);

  const upstream = new URL(EVENT_SERVICE_URL);
  upstream.pathname = `${upstream.pathname.replace(/\/+$/, "")}/availability/stream`;
  upstream.search = url.search; // giữ nguyên query

  const headers = filter(req.headers);
  if (userHeaders) userHeaders.forEach((v, k) => headers.set(k, v));

  headers.set("accept", "text/event-stream");

  let res: Response;
  try {
    res = await fetch(upstream.href, { method: "GET", headers });
  } catch (e) {
    console.error("[SSE PROXY ERROR]", e);
    return NextResponse.json({ message: "Proxy failed" }, { status: 502 });
  }

  const outHeaders = filter(res.headers);
  outHeaders.set("Cache-Control", "no-cache, no-transform");
  outHeaders.set("Connection", "keep-alive");

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}
