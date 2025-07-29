import { fetchAPI } from "../base";

async function fetchApplications<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  return fetchAPI<T>(`${path}`, options);
}

export async function fetchAllApplications(options = {}) {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  return await fetchApplications(`/organizers/applications?${params}`);
}

export async function approveApplication() {}

export async function rejectApplication() {}

export async function permanentRejectApplication() {}

export async function markApplicationProcessing() {}
