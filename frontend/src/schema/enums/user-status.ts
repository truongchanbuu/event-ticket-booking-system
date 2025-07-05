import { z } from "zod";
export enum USER_STATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BANNED = "banned",
  SUSPENDED = "suspended",
  PENDING = "pending",
  VERIFIED = "verified",
  UNVERIFIED = "unverified",
}

export const UserStatusEnum = z.nativeEnum(USER_STATUS);
export type UserStatus = z.infer<typeof UserStatusEnum>;
export default USER_STATUS;
