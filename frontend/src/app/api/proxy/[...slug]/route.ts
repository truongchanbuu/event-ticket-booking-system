import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

const serviceMap: Record<string, string | undefined> = {
  users: process.env.USER_SERVICE_URL,
  me: process.env.USER_SERVICE_URL,
  organizers: process.env.USER_SERVICE_URL,
  auth: process.env.AUTH_SERVICE_URL,
  media: process.env.MEDIA_SERVICE_URL,
  payment: process.env.PAYMENT_SERVICE_URL, // <-- Dễ dàng thêm service mới
};

async function handler(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  initializeFirebaseAdmin();

  // --- Xác thực token ---
  try {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) throw new Error("Missing token");
    await getAuth().verifyIdToken(token);
  } catch (err: any) {
    console.error(`[PROXY AUTH FAILED]`, err.message);
    return NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 }
    );
  }

  const params = await resolveParams(context.params);
  const slugParts = params.slug ?? [];

  const servicePrefix = slugParts[0];
  const backendBaseUrl = serviceMap[servicePrefix];

  if (!backendBaseUrl) {
    console.error(`[PROXY 404] No service for prefix "${servicePrefix}"`);
    return NextResponse.json({ message: "Service not found" }, { status: 404 });
  }

  // ✅ Giữ nguyên full path: /api/auth/logout, /api/me
  const fullPath = slugParts.join("/");
  const targetUrl = `${backendBaseUrl}/${fullPath}${req.nextUrl.search}`;
  console.log(`[PROXY] Forwarding request to: ${targetUrl}`);

  try {
    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      // @ts-ignore
      duplex: "half",
    });

    return new NextResponse(apiRes.body, {
      status: apiRes.status,
      headers: apiRes.headers,
    });
  } catch (err: any) {
    console.error(`[PROXY ERROR] Fetch failed to ${targetUrl}`, err);
    return NextResponse.json({ message: "Proxy failed" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return params instanceof Promise ? await params : params;
}
