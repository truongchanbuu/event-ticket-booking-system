import { ApplicationsApiResponse, Application } from "@/schema";
import { fetchAPI } from "../base";
import { boolean } from "zod";

async function fetchApplications<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  return fetchAPI<T>(`${path}`, options);
}

export async function fetchAllApplications(
  options = {}
): Promise<ApplicationsApiResponse> {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  return await fetchApplications(`/organizers/applications?${params}`);
}

// Edit Application
export async function setEditingApplication(applicationId: string) {
  return fetchAPI(`/organizers/applications/${applicationId}/editing`, {
    method: "PATCH",
  });
}

// ✅ Approve Application
export async function approveApplication(applicationId: string) {
  return fetchAPI(`/organizers/applications/${applicationId}/approve`, {
    method: "PATCH",
  });
}

// ✅ Reject Application (tạm thời)
export async function rejectApplication(
  applicationId: string,
  reason?: string
) {
  return fetchAPI(`/organizers/applications/${applicationId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

// ✅ Reject vĩnh viễn
export async function permanentRejectApplication(
  applicationId: string,
  reason?: string
) {
  return fetchAPI(
    `/organizers/applications/${applicationId}/permanent-reject`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
}

// ✅ Mark as Processing
export async function markApplicationProcessing(applicationId: string) {
  return fetchAPI(`/organizers/applications/${applicationId}/processing`, {
    method: "PATCH",
  });
}

export async function fetchApplicationById(appId: string): Promise<any> {
  return await fetchApplications(`/organizers/applications/${appId}`);
}

export async function getLastApplication(): Promise<any> {
  return await fetchApplications("/me/applications");
}
