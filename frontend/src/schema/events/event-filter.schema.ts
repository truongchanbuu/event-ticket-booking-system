import { z } from "zod";

export const EventFiltersSchema = z.object({
  categories: z.array(z.string()).optional(),
  date: z.string().optional(),
  timeRange: z.string().optional(),
  search: z.string().optional(),
});

export type EventFilters = z.infer<typeof EventFiltersSchema>;
