import { z } from "zod";

export enum ORGANIZER_STATUS {
  NONE = "none",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PERMANENTLY_REJECTED = "permanently_rejected",
  BANNED = "banned",
}

export const OrganizerStatusEnum = z.nativeEnum(ORGANIZER_STATUS);
export type OrganizerStatus = z.infer<typeof OrganizerStatusEnum>;
