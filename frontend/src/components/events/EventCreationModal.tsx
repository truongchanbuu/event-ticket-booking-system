import { NumericFormat } from "react-number-format";
import React, { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Tag,
  Info,
  AlertTriangle,
} from "lucide-react";
import { categories } from "@/constants/categories";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { useEventCreationForm } from "@/hooks/use-event-creation-hook";
import { Controller, FormProvider, useFieldArray } from "react-hook-form";
import { CreateEventFormValues } from "@/schema/events/event-creation.schema";
import { Textarea } from "../ui/textarea";
import MultipleDocumentUploader from "../ui/multi-document-uploader";
import { fileToBase64 } from "@/lib/helpers/file.helper";
import { uploadToCloudinary } from "@/services/cloudinary.service";
import { useUserProfile } from "@/hooks/user-store-hooks";

interface CreateEventModalProps {
  isOpen: boolean;
  isCreating?: boolean;
  allowClose?: boolean;
  onSubmit: (data: CreateEventFormValues) => void;
  onOpenChange: (isOpen: boolean) => void;
}

const CreateEventModal = ({
  isOpen,
  allowClose = false,
  isCreating = false,
  onSubmit,
  onOpenChange,
}: CreateEventModalProps) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const methods = useEventCreationForm();
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    reset,
    formState: { errors, isDirty },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ticketTypes",
  });

  const handlCancel = () => {
    setCurrentStep(1);
    reset();
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof CreateEventFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = [
        "title",
        "description",
        "images",
        "startTime",
        "endTime",
        "location",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = ["categories"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => setCurrentStep((prev) => prev - 1);

  const onFinalSubmit = async (data: CreateEventFormValues) => {
    setIsSubmitting(true);
    console.log("Form data is valid:", data);

    try {
      const imgUrls = await handleFiles(data.images);
      const finalData = {
        ...data,
        images: imgUrls,
      };
      onSubmit(finalData);
      console.log(`FINAL DATA: ${JSON.stringify(finalData)}`);
    } catch (e) {
      console.error(e);
    } finally {
      onOpenChange(false);
      setCurrentStep(1);
      reset();
    }
  };

  const ticketTypesValues = watch("ticketTypes");

  return (
    <Dialog
      open={isOpen}
      modal={isOpen}
      onOpenChange={(isOpen) => {
        setCurrentStep(1);
        reset();
        onOpenChange(isOpen);
      }}
    >
      <FormProvider {...methods}>
        <form>
          <DialogContent
            onInteractOutside={(e) => {
              if (!allowClose) e.preventDefault(); // Ngăn click ra ngoài
            }}
            onEscapeKeyDown={(e) => {
              if (!allowClose) e.preventDefault(); // Ngăn nhấn ESC
            }}
            className={cn(
              "max-w-7xl px-5 py-1",
              "flex flex-col justify-start",
              "h-[80vh]",
              "overflow-y-auto"
            )}
          >
            {/* Header */}
            <DialogHeader className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4 gap-4">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Create New Event
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step <= currentStep
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {step}
                      </div>
                      {step < 3 && (
                        <div
                          className={`w-12 h-0.5 ${step < currentStep ? "bg-indigo-600" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogDescription className="text-md text-center pt-4">
                {currentStep === 1 &&
                  "Tell us some basic details about your event."}
                {currentStep === 2 &&
                  "Select categories that best describe your event."}
                {currentStep === 3 && "Set up your ticket types and pricing."}
              </DialogDescription>
            </DialogHeader>

            {/* Content */}
            <div className="flex-grow p-6 overflow-y-auto">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <Label htmlFor="title">Event Title</Label>

                      <Input
                        id="title"
                        placeholder="Enter your event title..."
                        {...register("title")}
                      />

                      {errors.title && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <Label htmlFor="description">Description</Label>

                      <Textarea
                        id="description"
                        rows={4}
                        placeholder="Describe your event..."
                        {...register("description")}
                        className="w-full ..."
                      />

                      {errors.description && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <Controller
                        name="images"
                        control={control}
                        render={({ field }) => {
                          const handleImageChange = (files: any) => {
                            field.onChange(files);
                            trigger("images");
                          };

                          return (
                            <MultipleDocumentUploader
                              label="Event Images"
                              required
                              value={field.value}
                              onChange={handleImageChange}
                              error={errors.images?.message as string}
                            />
                          );
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="startTime">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Start Date & Time
                      </Label>

                      <Input
                        id="startTime"
                        type="datetime-local"
                        {...register("startTime")}
                      />

                      {errors.startTime && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.startTime.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endTime">
                        <Clock className="w-4 h-4 inline mr-2" />
                        End Date & Time
                      </Label>

                      <Input
                        id="endTime"
                        type="datetime-local"
                        {...register("endTime")}
                      />

                      {errors.endTime && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.endTime.message}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <Label htmlFor="location.address">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Event Location
                      </Label>

                      <Input
                        id="location.address"
                        placeholder="Enter full address..."
                        {...register("location.address")}
                      />
                      {errors.location?.address && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.location.address.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Categories */}
              {currentStep === 2 && (
                <Controller
                  name="categories"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            onClick={() => {
                              const newValue = field.value.includes(category.id)
                                ? field.value.filter((id) => id !== category.id)
                                : [...field.value, category.id];

                              field.onChange(newValue);
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                              "flex flex-col items-center justify-center text-center",
                              field.value.includes(category.id)
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="text-3xl mb-2">{category.icon}</div>
                            <div className="font-medium text-gray-900">
                              {category.name}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Hiển thị lỗi validation nếu có */}
                      {errors.categories && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.categories.message}
                        </p>
                      )}

                      {/* Phần hiển thị các category đã được chọn */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Tag className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-blue-800">
                            <strong>Selected categories:</strong>{" "}
                            {field.value && field.value.length > 0
                              ? field.value
                                  .map(
                                    (id) =>
                                      categories.find((c) => c.id === id)?.name
                                  )
                                  .filter(Boolean) // Loại bỏ các giá trị null/undefined nếu có
                                  .join(", ")
                              : "None selected. Please pick at least one."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}

              {/* Step 3: Ticket Types */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {/* Dùng `fields` từ useFieldArray */}
                    {fields.map((field, index) => (
                      <div key={field.id} className="bg-gray-50 p-6 ...">
                        <div className="flex items-center justify-between mb-4">
                          <h5>Ticket Type {index + 1}</h5>
                          {fields.length > 1 && (
                            <Button onClick={() => remove(index)}>
                              <X className="w-5 h-5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Ticket Name</Label>

                            <Input {...register(`ticketTypes.${index}.name`)} />
                            {errors.ticketTypes?.[index]?.name && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors.ticketTypes[index].name.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`ticketTypes.${index}.price`}>
                              Price (VND)
                            </Label>

                            <Controller
                              name={`ticketTypes.${index}.price`}
                              control={control}
                              render={({ field }) => (
                                <NumericFormat
                                  id={`ticketTypes.${index}.price`}
                                  customInput={Input}
                                  placeholder="0"
                                  thousandSeparator=","
                                  suffix=" VND"
                                  value={field.value}
                                  onValueChange={(values) => {
                                    field.onChange(values.floatValue);
                                  }}
                                />
                              )}
                            />
                            {/* Phần hiển thị lỗi không đổi */}
                            {errors.ticketTypes?.[index]?.price && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors.ticketTypes[index].price.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Quantity</Label>

                            <Input
                              type="number"
                              {...register(
                                `ticketTypes.${index}.totalQuantity`,
                                {
                                  valueAsNumber: true,
                                }
                              )}
                            />
                            {errors.ticketTypes?.[index]?.totalQuantity && (
                              <p className="text-sm text-red-500 mt-1">
                                {
                                  errors.ticketTypes[index].totalQuantity
                                    .message
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      onClick={() =>
                        append({
                          name: "",
                          price: 0,
                          totalQuantity: 1,
                        })
                      }
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-white hover:border-indigo-400 hover:text-white transition-colors"
                    >
                      + Add Another Ticket Type
                    </Button>

                    <div className="mt-4 space-y-4">
                      {fields.length === 0 && (
                        <div
                          className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-r-lg"
                          role="alert"
                        >
                          <div className="flex">
                            <div className="py-1">
                              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                            </div>
                            <div>
                              <p className="font-bold">No Ticket Found</p>
                              <p className="text-sm">
                                Your events need at least a ticket type to
                                publish. It will only draft mode.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {fields.length > 0 &&
                        ticketTypesValues?.every(
                          (ticket) => ticket.price === 0
                        ) && (
                          <div
                            className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg"
                            role="alert"
                          >
                            <div className="flex">
                              <div className="py-1">
                                <Info className="h-5 w-5 text-blue-500 mr-3" />
                              </div>
                              <div>
                                <p className="font-bold">Free Event</p>
                                <p className="text-sm">
                                  All tickets are free. This events will be
                                  marked as free for everyone.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      id="isFeatured"
                      {...register("isFeatured")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isFeatured" className="text-sm">
                      Mark as Feature
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="flex items-center justify-between p-6 ...">
              <Button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              <div className="flex space-x-3">
                <DialogClose asChild>
                  <Button onClick={handlCancel}>Cancel</Button>
                </DialogClose>
                {currentStep < 3 ? (
                  <Button
                    disabled={Object.values(errors).length > 0 || !isDirty}
                    type="button"
                    onClick={handleNextStep}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    disabled={Object.values(errors).length > 0}
                    loading={isCreating || submitting}
                    type="submit"
                    onClick={handleSubmit(onFinalSubmit)}
                  >
                    Create Event
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </form>
      </FormProvider>
    </Dialog>
  );
};

export default CreateEventModal;

const handleFiles = async (images) => {
  const files = images.map((img) => {
    return img.file;
  });

  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file, "events")
  );

  const imageUrls = await Promise.all(uploadPromises);
  return imageUrls;
};
