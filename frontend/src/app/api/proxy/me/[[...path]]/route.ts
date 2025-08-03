import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

const meServiceRegistry = {
  events: process.env.EVENT_SERVICE_URL,
  applications: process.env.USER_SERVICE_URL,
  tickets: process.env.PAYMENT_SERVICE_URL,
  payments: process.env.PAYMENT_SERVICE_URL,
};

/**
 * Hàm helper để đảm bảo params được resolve, vì nó có thể là một Promise.
 */
async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return params instanceof Promise ? await params : params;
}

/**
 * Handler chính, được chia sẻ bởi tất cả các phương thức HTTP (GET, POST, etc.).
 */
async function handler(
  req: NextRequest,
  context: { params: { path?: string[] } } // path có thể không tồn tại nếu request là /me
) {
  const headers = new Headers(req.headers);

  try {
    initializeFirebaseAdmin();
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      throw new Error("Missing authorization token");
    }
    const decodedToken = await getAuth().verifyIdToken(token);
    // Ghi đè header để truyền thông tin user xuống microservice một cách an toàn.
    headers.set("x-user-id", decodedToken.uid);
    headers.set("x-user-email", decodedToken.email || "");
  } catch (err: any) {
    console.error(`[ME PROXY AUTH FAILED]`, err.message);
    return NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 }
    );
  }

  // --- 2. Định tuyến (Routing) ---
  const resolvedParams = await resolveParams(context.params);

  const pathParts = resolvedParams.path || [];
  const firstSegment = pathParts[0];

  let targetServiceUrl: string | undefined;

  if (
    firstSegment &&
    meServiceRegistry[firstSegment as keyof typeof meServiceRegistry]
  ) {
    targetServiceUrl =
      meServiceRegistry[firstSegment as keyof typeof meServiceRegistry];
    console.log(
      `[ME PROXY] Matched sub-route "${firstSegment}", routing to its specific service.`
    );
  } else {
    targetServiceUrl = process.env.USER_SERVICE_URL;
    console.log(
      `[ME PROXY] No specific sub-route matched, defaulting to USER_SERVICE.`
    );
  }

  if (!targetServiceUrl) {
    console.error(
      `[ME PROXY 404] No service URL found for path: "me/${pathParts.join("/")}"`
    );
    return NextResponse.json(
      { message: "Service endpoint not configured" },
      { status: 404 }
    );
  }

  const targetPath = ["me", ...pathParts].join("/");

  const targetUrlObject = new URL(targetServiceUrl);
  targetUrlObject.pathname = `${targetUrlObject.pathname.replace(/\/$/, "")}/${targetPath}`;
  targetUrlObject.search = req.nextUrl.search;
  const targetUrl = targetUrlObject.href;

  console.log(`[ME PROXY ${req.method}] Forwarding to: ${targetUrl}`);

  const hasBody = ["POST", "PUT", "PATCH"].includes(req.method || "");
  const body = hasBody ? req.body : undefined;
  try {
    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // @ts-ignore - 'duplex' is required for streaming bodies in newer Node versions
      duplex: "half",
    });

    console.log(
      `[ME PROXY] Received response from upstream with status: ${apiRes.status}`
    );

    if (!apiRes.ok) {
      const resForLogging = apiRes.clone();
      const errorBody = await resForLogging
        .text()
        .catch(() => "Could not read error body");

      console.error(
        `[ME PROXY] Upstream service at ${targetUrl} returned an error:`,
        {
          status: apiRes.status,
          statusText: apiRes.statusText,
          body: errorBody,
        }
      );

      return new NextResponse(errorBody, {
        status: apiRes.status,
        statusText: apiRes.statusText,
        headers: apiRes.headers,
      });
    }

    return new NextResponse(apiRes.body, {
      status: apiRes.status,
      statusText: apiRes.statusText,
      headers: apiRes.headers,
    });
  } catch (err: any) {
    console.error(`[ME PROXY ERROR] Failed to fetch ${targetUrl}:`, err);
    return NextResponse.json(
      { message: "Proxy failed to connect to the upstream service" },
      { status: 502 } // 502 Bad Gateway là mã lỗi phù hợp
    );
  }
}

// Export handler cho tất cả các phương thức HTTP mà bạn muốn hỗ trợ
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
