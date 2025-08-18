import { auth } from "../firebase";

export interface FetchAPIOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function fetchAPI<T>(
  path: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const url = `/api/proxy${path.startsWith("/") ? path : "/" + path}`;

  const { skipAuth, headers, body, ...rest } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");

  // Auto-skip auth cho đường dẫn /public/**
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const autoSkipAuth = normalized.startsWith("public/");
  const shouldSkipAuth = skipAuth ?? autoSkipAuth;

  // Chuẩn hoá method & body
  const method = (rest.method ?? "GET").toUpperCase();
  const canHaveBody = !["GET", "HEAD"].includes(method);

  let finalBody: BodyInit | undefined = body as any;
  if (canHaveBody) {
    if (finalBody instanceof FormData) {
      // để nguyên, không set Content-Type
    } else if (
      finalBody &&
      typeof finalBody === "object" &&
      !(finalBody instanceof Blob) &&
      !(finalBody instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(finalBody)
    ) {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
      finalBody = JSON.stringify(finalBody);
    } else if (typeof finalBody === "string") {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
    }
  } else {
    finalBody = undefined; // không gửi body cho GET/HEAD
  }

  // Gắn token nếu không skipAuth
  if (!shouldSkipAuth) {
    const user = auth.currentUser;
    if (!user) {
      throw {
        statusCode: 401,
        message: "User is not authenticated",
        errorCode: "UNAUTHENTICATED",
      };
    }
    try {
      const token = await user.getIdToken();
      finalHeaders.set("Authorization", `Bearer ${token}`);
    } catch (error) {
      console.error("Cannot get token Firebase:", error);
      throw {
        statusCode: 401,
        message: "Failed to retrieve authentication token",
        errorCode: "TOKEN_ERROR",
      };
    }
  }

  const res = await fetch(url, {
    ...rest,
    method,
    body: finalBody,
    headers: finalHeaders,
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    console.error("❌ API Error:", res.status, res.statusText, data);
    throw {
      statusCode: data?.statusCode ?? res.status,
      errorCode: data?.errorCode ?? "UNKNOWN_ERROR",
      message: data?.message ?? res.statusText ?? "Unknown error",
      errors: data?.errors ?? [],
    };
  }

  return data as T;
}
