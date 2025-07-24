import { z } from "zod";

export const ExtractedBusinessLicenseSchema = z.object({
  businessName: z.string().min(1, "Business name is required."),
  businessCode: z
    .string()
    .min(10, "Business code must be at least 10 characters."),
  dateOfIssue: z.string().min(1, "Date of issue is required."),
  placeOfIssue: z.string().min(1, "Place of issue is required."),
  legalRepresentative: z.string().optional(),
  address: z.string().min(1, "Business address is required."),
  typeOfBusiness: z.string().optional(),
  registeredCapital: z.string().optional(),
  businessSectors: z.array(z.string()).optional(),
  taxCode: z.string().optional(),
  qrCodeData: z.string().optional(),
  scannedImageUrl: z.string().url().optional(),
});
