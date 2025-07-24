import { z } from "zod";

export interface FileValue {
  file: File;
  base64: string;
}

export const FileSchema = z.object({
  file: z
    .any()
    .refine((val) => val instanceof File, { message: "File is required" }),
  base64: z
    .string()
    .startsWith("data:image", { message: "Invalid image format" }),
});

export const OptionalFileSchema = FileSchema.optional();
