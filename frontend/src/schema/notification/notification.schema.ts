import { z } from "zod";
import { NotificationTypeEnum } from "../enums/notification-type";

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: NotificationTypeEnum,
  isRead: z.boolean().default(false),
  createdAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;
