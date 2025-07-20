import { z } from "zod";

export enum APPLY_STATUS {
  NONE = "none",
  PENDING = "pending",
  PROCESSING = "processing",
  PENDING_ADMIN = "pending_admin",
  APPROVED = "approved",
  REJECTED = "rejected",
  PERMANENT_REJECTED = "permanent_rejected",
  CANCELLED = "cancelled",
}

export const ApplyStatusEnum = z.nativeEnum(APPLY_STATUS);
export type ApplyStatus = z.infer<typeof ApplyStatusEnum>;
