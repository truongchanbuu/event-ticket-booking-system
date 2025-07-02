import { z } from "zod";
import { timestampSchema } from "../helper";

export const MinimizedEventSchema = z.object({
  eventID: z.string(),
  eventTitle: z.string(),
  thumbnails: z.array(z.string().url()),
  location: z.string(),
  startTime: timestampSchema,
  endTime: timestampSchema,
});

export type MinimizedEvent = z.infer<typeof MinimizedEventSchema>;
