import { z } from "zod";

export const ExtractedIdCardSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),

  idNumber: z
    .string()
    .min(9, "ID number must be at least 9 characters.")
    .max(12, "ID number must not exceed 12 characters."),

  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["Male", "Female"]).optional().or(z.string().optional()),
  nationality: z.string().default("Vietnam").optional(),
  placeOfOrigin: z.string().optional(),
  permanentAddress: z.string().min(1, "Permanent address is required."),
  dateOfIssue: z.string().min(1, "Date of issue is required."),
  placeOfIssue: z.string().min(1, "Place of issue is required."),
  qrCodeData: z.string().optional(), // Data from QR code, if extracted
  mrzCode: z.string().optional(), // Machine-readable zone code, if available
  photoUrl: z.string().url().optional(), // Extracted portrait image
  signatureImageUrl: z.string().url().optional(), // Extracted signature image
});
