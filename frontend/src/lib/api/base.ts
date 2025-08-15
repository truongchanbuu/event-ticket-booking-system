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

  if (!(body instanceof FormData) && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
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
    body,
    headers: finalHeaders,
  });

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
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
