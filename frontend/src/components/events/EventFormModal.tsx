"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createEventAPI,
  updateEventAPI,
  getCategoriesAPI,
  uploadEventImageAPI,
} from "@/lib/api/base";
import type { EventType, Category } from "@/schema";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/AuthProvider";

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  event?: EventType | null;
  onSuccess: () => void;
}

interface TicketType {
  id?: string;
  name: string;
  price: number;
  maxPerPerson: number;
  description: string;
  serviceFee?: number;
}

export default function EventFormModal({
  open,
  onClose,
  event,
  onSuccess,
}: EventFormModalProps) {
  const [formData, setFormData] = useState({
    eventTitle: "",
    eventDesc: "",
    location: "",
    startTime: new Date(),
    endTime: new Date(),
    categories: [] as string[],
    thumbnails: [] as string[],
    ticketTypes: [] as TicketType[],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategoriesAPI();
        setCategories(response.data || response || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        eventTitle: event.eventTitle,
        eventDesc: event.eventDesc,
        location: event.location,
        startTime: event.startTime.toDate(),
        endTime: event.endTime.toDate(),
        categories: event.categories.map((cat) => cat.id),
        thumbnails: event.thumbnails,
        ticketTypes: event.ticketTypes.map((ticket) => ({
          id: ticket.typeID,
          name: ticket.name,
          price: ticket.price,
          maxPerPerson: ticket.maxPerPerson,
          description: ticket.description,
          serviceFee: ticket.serviceFee,
        })),
      });
    } else {
      setFormData({
        eventTitle: "",
        eventDesc: "",
        location: "",
        startTime: new Date(),
        endTime: new Date(),
        categories: [],
        thumbnails: [],
        ticketTypes: [],
      });
    }
    setHasChanges(false);
  }, [event, open]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [formData]);

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      return createEventAPI(data, token);
    },
    onSuccess: () => {
      toast({ title: "Event created successfully!", variant: "success" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      return updateEventAPI(event?.eventID || "", data, token);
    },
    onSuccess: () => {
      toast({ title: "Event updated successfully!", variant: "success" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        status: EVENT_STATUS.DRAFT,
      };

      if (event) {
        await updateEventMutation.mutateAsync(submitData);
      } else {
        await createEventMutation.mutateAsync(submitData);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedDialog(false);
    setHasChanges(false);
    onClose();
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [
        ...prev.ticketTypes,
        {
          name: "",
          price: 0,
          maxPerPerson: 1,
          description: "",
          serviceFee: 0,
        },
      ],
    }));
  };

  const removeTicketType = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, i) => i !== index),
    }));
  };

  const updateTicketType = (
    index: number,
    field: keyof TicketType,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((ticket, i) =>
        i === index ? { ...ticket, [field]: value } : ticket
      ),
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    try {
      const token = await user.getIdToken();
      const uploadedUrls = [];

      for (const file of Array.from(files)) {
        const response = await uploadEventImageAPI(file, token);
        uploadedUrls.push(response.data?.url || response.url);
      }

      setFormData((prev) => ({
        ...prev,
        thumbnails: [...prev.thumbnails, ...uploadedUrls],
      }));

      toast({ title: "Images uploaded successfully!", variant: "success" });
    } catch (error) {
      console.error("Failed to upload images:", error);
      toast({ title: "Failed to upload images", variant: "destructive" });
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      thumbnails: prev.thumbnails.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {event ? "Edit Event" : "Create New Event"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="eventTitle">Event Title *</Label>
                  <Input
                    id="eventTitle"
                    value={formData.eventTitle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        eventTitle: e.target.value,
                      }))
                    }
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="eventDesc">Description *</Label>
                  <Textarea
                    id="eventDesc"
                    value={formData.eventDesc}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        eventDesc: e.target.value,
                      }))
                    }
                    placeholder="Describe your event"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="Enter event location"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startTime
                            ? format(formData.startTime, "PPP HH:mm")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startTime}
                          onSelect={(date) =>
                            date &&
                            setFormData((prev) => ({
                              ...prev,
                              startTime: date,
                            }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>End Date & Time *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endTime && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endTime
                            ? format(formData.endTime, "PPP HH:mm")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endTime}
                          onSelect={(date) =>
                            date &&
                            setFormData((prev) => ({ ...prev, endTime: date }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant={
                        formData.categories.includes(category.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Event Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="imageUpload">Upload Images</Label>
                  <Input
                    id="imageUpload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                </div>

                {formData.thumbnails.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.thumbnails.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Event image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Types */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.ticketTypes.map((ticket, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Ticket Type {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTicketType(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Type Name *</Label>
                        <Input
                          value={ticket.name}
                          onChange={(e) =>
                            updateTicketType(index, "name", e.target.value)
                          }
                          placeholder="e.g., General Admission, VIP"
                          required
                        />
                      </div>

                      <div>
                        <Label>Price *</Label>
                        <Input
                          type="number"
                          value={ticket.price}
                          onChange={(e) =>
                            updateTicketType(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <Label>Max Per Person *</Label>
                        <Input
                          type="number"
                          value={ticket.maxPerPerson}
                          onChange={(e) =>
                            updateTicketType(
                              index,
                              "maxPerPerson",
                              parseInt(e.target.value) || 1
                            )
                          }
                          placeholder="1"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <Label>Service Fee</Label>
                        <Input
                          type="number"
                          value={ticket.serviceFee || 0}
                          onChange={(e) =>
                            updateTicketType(
                              index,
                              "serviceFee",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={ticket.description}
                          onChange={(e) =>
                            updateTicketType(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Describe this ticket type"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addTicketType}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ticket Type
                </Button>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {event ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Close Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
