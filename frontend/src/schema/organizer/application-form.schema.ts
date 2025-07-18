import { z } from "zod";

const FILE_REQUIRED_ERROR = "This document is required.";

const FileSchema = z.instanceof(File, { message: FILE_REQUIRED_ERROR });

// Schema chính cho form đăng ký
export const ApplyOrganizerSchema = z
  .object({
    type: z.enum(["personal", "business"], {
      required_error: "Please select a type of organization.",
    }),
    identityCardFront: FileSchema,
    identityCardBack: FileSchema,
    businessLicense: FileSchema.optional(),
    eventLicense: FileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "business" && !data.businessLicense) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: FILE_REQUIRED_ERROR,
        path: ["businessLicense"],
      });
    }
  });

export type ApplyOrganizerFormData = z.infer<typeof ApplyOrganizerSchema>;
