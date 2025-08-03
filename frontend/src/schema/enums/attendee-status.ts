import { z } from "zod";

export enum ATTENDEE_STATUS {
  REGISTERED = "registered",
  CHECKED_IN = "checked_in",
  CANCELLED = "cancelled",
}

export const AttendeeStatusEnum = z.nativeEnum(ATTENDEE_STATUS);
export type AttendeeStatus = z.infer<typeof AttendeeStatusEnum>;
