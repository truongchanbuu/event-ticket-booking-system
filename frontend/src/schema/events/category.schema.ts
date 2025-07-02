import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().min(1),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, {
    message: "Invalid hex color code",
  }),
  description: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;
