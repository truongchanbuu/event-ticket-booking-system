import { fetchAPI } from "../base";

async function fetchUser<T>(path: string, options?: RequestInit): Promise<T> {
  return fetchAPI<T>(`${path}`, options);
}

export async function createUserAPI(userData: any): Promise<any> {
  return fetchUser<any>("/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function getUserProfileAPI(): Promise<any> {
  return fetchUser<any>("/me");
}

export async function updateUserAPI(userData: any): Promise<any> {
  return fetchUser<any>("/me", {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

export async function deleteUserAPI(): Promise<any> {
  return fetchUser<any>("/me", {
    method: "DELETE",
  });
}

export async function applyOrganizer(data: any): Promise<any> {
  return fetchAPI("/organizers/apply", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
