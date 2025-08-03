import { z } from "zod";

export enum EVENT_STATUS {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export const EventStatusEnum = z.nativeEnum(EVENT_STATUS);
export type EventStatus = z.infer<typeof EventStatusEnum>;
