import { z } from "zod";

export const signUploadSchema = z.object({
    docType: z.string().optional(),
    folder: z.string().optional(),
    id: z.string().optional(),
});
