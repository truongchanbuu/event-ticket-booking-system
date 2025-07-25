import { AppUser } from "@/schema/user";
import { fetchAPI } from "../base";

const BASE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL!;

async function fetchUser<T>(path: string, options?: RequestInit): Promise<T> {
  return fetchAPI<T>(`${BASE_URL}${path}`, options);
}

export async function createUserAPI(userData: AppUser): Promise<any> {
  return fetchUser<any>("/api/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function getUserProfileAPI(): Promise<any> {
  return fetchUser<any>("/api/me");
}

export async function updateUserAPI(userData: any): Promise<any> {
  return fetchUser<any>("/api/me", {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

export async function deleteUserAPI(): Promise<any> {
  return fetchUser<any>("/api/me", {
    method: "DELETE",
  });
}

export async function applyOrganizer(data: any): Promise<any> {
  return fetchAPI("/api/organizers/apply", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
