import { z } from "zod";

export const extractTextSchema = z.object({
  base64Image: z
    .string()
    .min(1, "base64Image is required")
    .regex(/^data:image\/(png|jpeg|jpg);base64,/, {
      message: "Invalid base64 image format",
    }),
});

export type ExtractTextInput = z.infer<typeof extractTextSchema>;

export const extractMultipleTextSchema = z.object({
  images: z
    .array(
      z
        .string()
        .min(1, "Image is required")
        .regex(/^data:image\/(png|jpeg|jpg);base64,/, {
          message: "Invalid base64 image format",
        })
    )
    .min(1, "At least one image is required"),
});

export type ExtractMultipleTextInput = z.infer<
  typeof extractMultipleTextSchema
>;

export interface CachedOcrResult {
  status: "ok" | "blurry" | "failed";
  text: string | null;
  confidence: number | null;
}
