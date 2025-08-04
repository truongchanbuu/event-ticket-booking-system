import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, MapPin, Calendar, Clock, Users, Tag } from "lucide-react";
import { Event } from "@/schema";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import {
  UpdateEvent,
  UpdateEventSchema,
} from "@/schema/events/update-event.schema";
import { toDatetimeLocalString, toISOStringFromLocal } from "@/lib/utils";
import { UpdateEventFn } from "@/types/event.api";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";

interface UpdateEventModalProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  event: Event;
  onUpdate: UpdateEventFn;
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateEvent>({
    resolver: zodResolver(UpdateEventSchema),
    defaultValues: {
      title: "",
      description: "",
      images: [],
      categories: [],
      startTime: "",
      endTime: "",
      location: {
        address: "",
        coordinates: undefined,
      },
      status: EVENT_STATUS.DRAFT,
      isFeatured: false,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (event && isOpen) {
      form.reset({
        title: event.title,
        description: event.description,
        images: event.images,
        categories: event.categories,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        status: event.status,
        isFeatured: event.isFeatured,
      });
    }
  }, [event, isOpen, form]);

  const onSubmit = async (data: UpdateEvent) => {
    if (!event) return;

    setIsLoading(true);
    try {
      const dirtyFields = form.formState.dirtyFields;
      const changedValues = Object.entries(dirtyFields).reduce(
        (acc, [key, isDirty]) => {
          if (isDirty) acc[key] = form.getValues()[key];
          return acc;
        },
        {} as Partial<Event>
      );
      await onUpdate(changedValues);
      onClose(false);
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Update Event
          </DialogTitle>
          <DialogDescription>
            Make changes to your event. All fields marked with * are required.
            You can change images or categories directly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your event..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.values(EVENT_STATUS).map((status) => (
                            <option key={status} value={status}>
                              {toUpperCaseFirstLetter(status)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Featured Event
                        </FormLabel>
                        <FormDescription>
                          Mark this event as featured to highlight it
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Date & Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Date & Location</h3>

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Start Time *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={toDatetimeLocalString(field.value)}
                          onChange={(e) => {
                            field.onChange(
                              toISOStringFromLocal(e.target.value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        End Time *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={toDatetimeLocalString(field.value)}
                          onChange={(e) => {
                            field.onChange(
                              toISOStringFromLocal(e.target.value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter event location..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Event Stats (Read-only) */}
            {event && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Event Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {event.stats.participantCount}
                    </div>
                    <div className="text-sm text-gray-600">Participants</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {event.stats.checkInCount}
                    </div>
                    <div className="text-sm text-gray-600">Check-ins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {event.stats.ticketSoldCount}
                    </div>
                    <div className="text-sm text-gray-600">Tickets Sold</div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isLoading || !form.formState.isDirty}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isLoading ? "Updating..." : "Update Event"}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateEventModal;
