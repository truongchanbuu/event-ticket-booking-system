import { z } from "zod";

export const deleteImageSchema = z.object({
    publicId: z.string().nonempty(),
});
