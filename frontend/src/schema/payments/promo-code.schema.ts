import { z } from "zod";

export const PromoCodeSchema = z.object({
  id: z.number().optional(),
  code: z.string(),
  discount: z.number(),
  active: z.boolean().default(true),
});

export type PromoCode = z.infer<typeof PromoCodeSchema>;
