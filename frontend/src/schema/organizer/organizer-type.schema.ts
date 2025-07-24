import { z } from "zod";

export const OrganizerTypeSchema = z.enum(["personal", "business"], {
  required_error: "You must be an organizer type",
});
export type OrganizerType = z.infer<typeof OrganizerTypeSchema>;
