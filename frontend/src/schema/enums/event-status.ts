import { z } from "zod";

export enum EventStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export const EventStatusEnum = z.nativeEnum(EventStatus);
