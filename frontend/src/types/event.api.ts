import { EventReponse } from "@/lib/api/events/api";
import { Event } from "@/schema";
import { UseMutateAsyncFunction } from "@tanstack/react-query";

export type EventUpdateInput = Partial<Event>;

export type UpdateEventFn = UseMutateAsyncFunction<
  { data: Event },
  Error,
  EventUpdateInput,
  unknown
>;

export type CancelFunction = UseMutateAsyncFunction<
  EventReponse,
  Error,
  string | undefined,
  { previousData: EventReponse | undefined }
>;

export type PublishEventFunction = UseMutateAsyncFunction<
  EventReponse,
  Error,
  string | undefined,
  { previousData: EventReponse | undefined }
>;
