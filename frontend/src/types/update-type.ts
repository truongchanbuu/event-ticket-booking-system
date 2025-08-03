import { Event } from "@/schema";
import { UseMutateAsyncFunction } from "@tanstack/react-query";

export type EventUpdateInput = Partial<Event>;

export type UpdateEventFn = UseMutateAsyncFunction<
  { data: Event },
  Error,
  EventUpdateInput,
  unknown
>;
