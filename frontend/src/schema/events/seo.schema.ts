import { z } from "zod";

export const SeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(), // OG/Twitter image override
  canonical: z.string().url().optional(),
  noindex: z.boolean().optional(), // true => robots noindex, nofollow
});

export const OpenGraphSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

export type Seo = z.infer<typeof SeoSchema>;
export type OpenGraph = z.infer<typeof OpenGraphSchema>;
