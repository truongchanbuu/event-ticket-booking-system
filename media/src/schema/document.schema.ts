import { z } from "zod";
import { DOCUMENT_TYPES } from "./document-type";

export const signUploadSchema = z.object({
    docType: z.enum(DOCUMENT_TYPES).optional(),
});
