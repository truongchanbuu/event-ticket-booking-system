import { z } from "zod";

export enum NOTIFICATION_TYPE {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  PROMOTION = "promotion",
  EVENT = "event",
}

export const NotificationTypeEnum = z.nativeEnum(NOTIFICATION_TYPE);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;
