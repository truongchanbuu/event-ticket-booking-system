import { z } from "zod";

// === SCHEMA CHO CÁC THÀNH PHẦN CƠ BẢN ===
const FILE_REQUIRED_ERROR = "This document is required.";
const FileSchema = z.custom<File>(
  (val) => val instanceof File,
  FILE_REQUIRED_ERROR
);
const OptionalFileSchema = z
  .custom<File>((val) => val instanceof File)
  .optional();

// === STEP 1: THÔNG TIN TỔ CHỨC === (Không thay đổi)
export const ApplyOrganizerStep1Schema = z.object({
  type: z.enum(["personal", "business"], {
    required_error: "Please select a type of organization.",
  }),
  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters.")
    .max(500, "Bio must be under 500 characters."),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  facebookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagramUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  xUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// === STEP 2: FACTORY FUNCTION CHO SCHEMA GIẤY TỜ ===
/**
 * Tạo schema validation cho Step 2 dựa trên loại tổ chức được chọn ở Step 1.
 * @param organizationType Loại tổ chức ('personal' hoặc 'business').
 * @returns Schema Zod cho dữ liệu của Step 2.
 */
export const createApplyOrganizerStep2Schema = (
  organizationType: "personal" | "business"
) => {
  return z.object({
    // CMND/CCCD luôn luôn là bắt buộc cho cả hai loại.
    identityCardFront: FileSchema,
    identityCardBack: FileSchema,

    // Giấy phép kinh doanh chỉ bắt buộc khi loại hình là 'business'.
    businessLicense:
      organizationType === "business"
        ? FileSchema.refine(
            (file) => file?.name,
            "Business license is required."
          )
        : OptionalFileSchema,

    // Giấy phép tổ chức sự kiện luôn là không bắt buộc.
    eventLicense: OptionalFileSchema,
  });
};

// === SCHEMA TỔNG HỢP (QUAN TRỌNG!) ĐỂ VALIDATE LẦN CUỐI ===
// Schema này đảm bảo toàn bộ dữ liệu là nhất quán trước khi gửi đi.
// z.discriminatedUnion là công cụ hoàn hảo cho việc này.
export const ApplyOrganizerFormSchema = z.discriminatedUnion("type", [
  // Trường hợp 1: type là 'personal'
  z.object({
    ...ApplyOrganizerStep1Schema.shape,
    type: z.literal("personal"),
    identityCardFront: FileSchema,
    identityCardBack: FileSchema,
    businessLicense: OptionalFileSchema, // Không bắt buộc
    eventLicense: OptionalFileSchema,
  }),
  // Trường hợp 2: type là 'business'
  z.object({
    ...ApplyOrganizerStep1Schema.shape,
    type: z.literal("business"),
    identityCardFront: FileSchema,
    identityCardBack: FileSchema,
    businessLicense: FileSchema, // Bắt buộc
    eventLicense: OptionalFileSchema,
  }),
]);

// === CÁC KIỂU DỮ LIỆU (TYPES) ===
export type ApplyOrganizerStep1Data = z.infer<typeof ApplyOrganizerStep1Schema>;

// Kiểu cho Step 2 có thể được tạo ra từ factory, nhưng để đơn giản, ta có thể định nghĩa nó rộng hơn
export type ApplyOrganizerStep2Data = z.infer<
  ReturnType<typeof createApplyOrganizerStep2Schema>
>;

// Kiểu cuối cùng cho toàn bộ form
export type ApplyOrganizerFormData = z.infer<typeof ApplyOrganizerFormSchema>;
