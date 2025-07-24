import { z } from "zod";

export const ExtractedEventPermitSchema = z.object({
  eventName: z.string().min(1, "Event name is required."),
  organizerName: z.string().min(1, "Organizer name is required."),
  eventDate: z.string().min(1, "Event date is required."),
  eventTime: z.string().optional(),
  location: z.string().min(1, "Event location is required."),
  issueDate: z.string().min(1, "Permit issue date is required."),
  issuedBy: z.string().min(1, "Issuing authority is required."),
  permitNumber: z.string().optional(),
  purpose: z.string().optional(),
  signedBy: z.string().optional(),
  qrCodeData: z.string().optional(),
  scannedImageUrl: z.string().url().optional(),
});
