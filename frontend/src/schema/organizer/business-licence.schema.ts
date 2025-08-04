import { z } from "zod";

export const allowedSectorRegex = /^[\p{L}\p{N}\s\-]{2,50}$/u; // chữ cái, số, dấu cách, dấu gạch, 2-50 ký tự
export const ExtractedBusinessLicenseSchema = z.object({
  businessName: z.string().min(1, "Business name is required."),
  businessCode: z
    .string()
    .min(10, "Business code must be at least 10 characters."),
  dateOfIssue: z.string().min(1, "Date of issue is required."),
  placeOfIssue: z.string().min(1, "Place of issue is required."),
  legalRepresentative: z.string().optional(),
  address: z.string().min(1, "Business address is required."),
  typeOfBusiness: z.enum([
    "Doanh nghiệp tư nhân",
    "Công ty TNHH một thành viên",
    "Công ty TNHH hai thành viên trở lên",
    "Công ty cổ phần",
    "Công ty hợp danh",
  ]),
  registeredCapital: z.string().optional(),
  businessSectors: z
    .array(
      z
        .string()
        .min(2, "It should have at least 2 letters.")
        .max(50, "It should have equal or less than 50 letters.")
        .regex(
          allowedSectorRegex,
          "Only character, number and space are available."
        )
    )
    .optional(),
  taxCode: z.string().optional(),
  qrCodeData: z.string().optional(),
  scannedImageUrl: z.string().url().optional(),
});
