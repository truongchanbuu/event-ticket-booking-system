import { SignUploadResponse } from "@/schema";
import { fetchAPI } from "../base";

async function fetchAuth<T>(path: string, options: RequestInit): Promise<T> {
  return fetchAPI<T>(`/public/auth${path}`, options);
}

export async function createSession(): Promise<SignUploadResponse> {
  return fetchAuth("/session", {
    method: "POST",
  });
}

export async function logOut() {
  return fetchAuth("/logout", { method: "POST" });
}

export async function verifySession(cookie) {
  return fetchAuth("/verify-session", {
    headers: {
      Cookie: `session=${cookie}`,
    },
    method: "POST",
    credentials: "include",
  });
}

export async function verifyToken() {
  console.log("STARTING....");
  return fetchAuth("/verify-token", { method: "POST" });
}
