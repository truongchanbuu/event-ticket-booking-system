import { ApplicationWithEventPermit, ApplyOrganizerFormData } from "@/schema";

/**
 * Type Guard Function để xác định an toàn xem `data` có chứa thông tin
 * hợp lệ của Giấy phép sự kiện hay không.
 *
 * @param data Dữ liệu form đầy đủ có kiểu `ApplyOrganizerFormData`.
 * @returns `true` và thu hẹp kiểu của `data` nếu có dữ liệu giấy phép.
 */
export function hasEventPermitData(
  data: ApplyOrganizerFormData
): data is ApplicationWithEventPermit {
  return Boolean(data.eventLicense);
}
