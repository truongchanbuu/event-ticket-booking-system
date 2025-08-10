import { NextRequest, NextResponse } from "next/server";

const serviceRegistry = {
  users: process.env.USER_SERVICE_URL,
  tickets: process.env.TICKET_SERVICE_URL,
  organizers: process.env.USER_SERVICE_URL,
  events: process.env.EVENT_SERVICE_URL,
  availability: process.env.EVENT_SERVICE_URL,
  auth: process.env.AUTH_SERVICE_URL,
  media: process.env.MEDIA_SERVICE_URL,
  payment: process.env.PAYMENT_SERVICE_URL,
};

export async function handler(
  req: NextRequest,
  context: { params: { service: string; path: string[] } }
) {
  const headers = new Headers(req.headers);
  const resolvedParams = await resolveParams(context.params);
  const { service, path } = resolvedParams;
  const remainingPath =
    Array.isArray(path) && path.length > 0 ? path.join("/") : "";

  console.log(`[PROXY] Service: "${service}", Path: "${remainingPath}"`);

  const serviceUrl = serviceRegistry[service as keyof typeof serviceRegistry];

  if (!serviceUrl) {
    console.error(`[PROXY 404] No service found for service name "${service}"`);
    return NextResponse.json({ message: "Service not found" }, { status: 404 });
  }

  const fullPathParts = [service, ...(path || [])].filter(Boolean);
  const targetPath = fullPathParts.join("/");
  const targetUrlObject = new URL(serviceUrl);
  targetUrlObject.pathname = `${targetUrlObject.pathname}/${targetPath}`;
  targetUrlObject.search = req.nextUrl.search;

  const targetUrl = targetUrlObject.href;

  console.log(`[PROXY ${req.method}] Forwarding request to: ${targetUrl}`);

  const hasBody = ["POST", "PUT", "PATCH"].includes(req.method || "");
  const body = hasBody ? req.body : undefined;
  try {
    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // @ts-ignore
      duplex: "half",
    });

    console.log(
      `[ME PROXY] Received response from upstream with status: ${apiRes.status}`
    );

    if (!apiRes.ok) {
      // Clone response. `resForLogging` dùng để lấy body cho việc log.
      // `apiRes` gốc sẽ được truyền đi.
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

export async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return params instanceof Promise ? await params : params;
}
