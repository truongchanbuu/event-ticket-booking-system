import { z } from "zod";

export enum EVENT_STATUS {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  POSTPONED = "postponed",
  SOLD_OUT = "sold_out",
  ONGOING = "ongoing",
  ENDED = "ended",
  ARCHIVED = "archived",
}

export const EventStatusEnum = z.nativeEnum(EVENT_STATUS);
export type EventStatus = z.infer<typeof EventStatusEnum>;
export default EVENT_STATUS;
