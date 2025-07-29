import { z } from "zod";

export const MinimizedEventSchema = z.object({
  eventID: z.string(),
  eventTitle: z.string(),
  thumbnails: z.array(z.string().url()),
  location: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export type MinimizedEvent = z.infer<typeof MinimizedEventSchema>;
