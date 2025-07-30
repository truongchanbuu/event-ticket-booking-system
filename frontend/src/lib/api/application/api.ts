import {
  Application,
  ApplicationListReponse,
  ApplicationReponse,
  APPLY_STATUS,
} from "@/schema";
import { fetchAPI } from "../base";
import { QueryFunctionContext } from "@tanstack/react-query";
import { ApplicationQueryKey } from "@/types/application/application-type";

async function fetchApplications<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return fetchAPI<T>(formattedPath, options);
}

export async function fetchAllApplications(
  context: QueryFunctionContext<ApplicationQueryKey, string | null>
): Promise<ApplicationListReponse> {
  const { queryKey, pageParam } = context;
  const [_key, options = {}] = queryKey; // ✨ Thêm giá trị mặc định cho options

  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  if (pageParam) {
    params.append("startAfter", pageParam);
  }

  return await fetchApplications(`/organizers/applications?${params}`);
}

export async function getLastApplication(): Promise<ApplicationReponse> {
  return fetchApplications("/me/applications");
}

export async function updateMyApplication(
  appId: string,
  data: Partial<Application>
): Promise<void> {
  return fetchApplications(`/me/applications/${appId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Các hàm Mutation (PATCH, POST,...) ---
export async function performRejectAction(
  applicationId: string,
  endpoint: "reject" | "permanent-reject",
  reason?: string
): Promise<any> {
  return fetchAPI(`/organizers/applications/${applicationId}/${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function patchApplicationStatus(
  applicationId: string,
  status: APPLY_STATUS,
  data?: any
): Promise<any> {
  return fetchAPI(`/organizers/applications/${applicationId}/${status}`, {
    method: "PATCH",
    body: JSON.stringify(data || {}),
  });
}

export async function fetchApplicationById(
  appId: string
): Promise<ApplicationReponse> {
  return fetchApplications(`/organizers/applications/${appId}`);
}

/**
 * [Admin] Duyệt một đơn ứng tuyển.
 * @param applicationId ID của đơn cần duyệt
 * @param reviewedBy Tên hoặc ID của admin thực hiện
 */
export async function approveApplication(
  applicationId: string,
  reviewedBy: string
): Promise<any> {
  return patchApplicationStatus(applicationId, APPLY_STATUS.APPROVED, {
    reviewedBy,
  });
}

/**
 * [Admin] Từ chối một đơn ứng tuyển.
 * @param applicationId ID của đơn cần từ chối
 * @param rejectionReason Lý do từ chối (bắt buộc)
 * @param reviewedBy Tên hoặc ID của admin thực hiện
 * @param isPermanent Đánh dấu nếu là từ chối vĩnh viễn
 */
export async function rejectApplication(
  applicationId: string,
  rejectionReason: string,
  reviewedBy: string,
  isPermanent: boolean = false
): Promise<any> {
  const status = isPermanent
    ? APPLY_STATUS.PERMANENT_REJECTED
    : APPLY_STATUS.REJECTED;
  return patchApplicationStatus(applicationId, status, {
    rejectionReason,
    reviewedBy,
  });
}

/**
 * [Admin] Đánh dấu một đơn là đang được xử lý.
 * @param applicationId ID của đơn
 * @param reviewedBy Tên hoặc ID của admin thực hiện
 */
export async function markApplicationAsProcessing(
  applicationId: string,
  reviewedBy: string
): Promise<any> {
  return patchApplicationStatus(applicationId, APPLY_STATUS.PROCESSING, {
    reviewedBy,
  });
}

export async function lockApplication(
  applicationId: string,
  reviewedBy: string
): Promise<any> {
  return patchApplicationStatus(applicationId, APPLY_STATUS.LOCKED_BY_ADMIN, {
    reviewedBy,
  });
}

// --- Dành cho người dùng (chủ đơn) ---

/**
 * [User] Chuyển đơn về trạng thái chỉnh sửa.
 * Dựa trên logic backend, người dùng chỉ có thể làm điều này khi đơn chưa được xử lý.
 * @param applicationId ID của đơn
 */
export async function revertApplicationToPending(
  applicationId: string
): Promise<any> {
  return patchApplicationStatus(applicationId, APPLY_STATUS.PENDING);
}
