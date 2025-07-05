import { z } from "zod";

export enum ORGANIZER_STATUS {
  NONE = "none",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const OrganizerStatusEnum = z.nativeEnum(ORGANIZER_STATUS);
export type OrganizerStatus = z.infer<typeof OrganizerStatusEnum>;
