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
  Users,
  Star,
  UserPlus,
  Camera,
  AlertCircle,
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
import MultipleDocumentUploader from "../ui/multi-document-uploader";
import { EventManagementService } from "@/services/event-management.service";
import { useUserProfile } from "@/hooks/user-store-hooks";
import { toast } from "@/hooks/use-toast";
import { TextEditor } from "./text-editor";

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
  const userProfile = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const methods = useEventCreationForm();
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    clearErrors,
    formState: { errors, isDirty },
  } = methods;

  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({
    control,
    name: "ticketTypes",
  });

  const {
    fields: contributorFields,
    append: appendContributor,
    remove: removeContributor,
  } = useFieldArray({
    control,
    name: "eventContributors",
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
    } else if (currentStep === 3) {
      // Contributors step - optional validation
      fieldsToValidate = ["eventContributors"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => setCurrentStep((prev) => prev - 1);

  const onFinalSubmit = async (data: CreateEventFormValues) => {
    if (!userProfile) {
      toast({ variant: "destructive", title: "No user found." });
      return;
    }
    console.log("Form data is valid:", data);
    setIsSubmitting(true);

    try {
      const userID = userProfile!.userID;
      const eventImages = await handleThumbnails(userID, data.images);
      const contributors = await Promise.all(
        data.eventContributors.map(async (contributor) => {
          let photoUrl = "";
          if (contributor.photo instanceof File) {
            const url = await EventManagementService.uploadContributorUrls({
              userID,
              file: contributor.photo,
            });
            photoUrl = url;
          } else if (typeof contributor.photo === "string") {
            photoUrl = contributor.photo;
          }

          return {
            ...contributor,
            photoUrl,
          };
        })
      );

      const finalData = {
        ...data,
        photo: undefined,
        images: eventImages,
        eventContributors: contributors,
      };

      console.log(`FINAL DATA: ${JSON.stringify(finalData)}`);
      onSubmit(finalData);
    } catch (e) {
      console.error(e);
    } finally {
      onOpenChange(false);
      setCurrentStep(1);
      reset();
      setIsSubmitting(false);
    }
  };

  const ticketTypesValues = watch("ticketTypes");
  const contributorsValues = watch("eventContributors");

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
              if (!allowClose) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (!allowClose) e.preventDefault();
            }}
            className={cn(
              "w-full max-w-7xl",
              "mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12",
              "my-2 sm:my-4 md:my-6",
              "flex flex-col justify-start",
              "min-h-[70vh] h-[80vh] max-h-screen sm:h-[82vh] md:h-[85vh]",
              "overflow-y-auto overflow-x-hidden scroll-smooth"
            )}
          >
            {/* Header */}
            <DialogHeader className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4 gap-4">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Create New Event
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4].map((step) => (
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
                      {step < 4 && (
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
                {currentStep === 3 &&
                  "Add event contributor, speakers, or performers to your event."}
                {currentStep === 4 && "Set up your ticket types and pricing."}
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

                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <TextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Describe your event in detail..."
                          />
                        )}
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

              {/* Step 3: Contributors */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    {contributorFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <h5 className="text-xl font-semibold text-gray-900">
                              Contributor {index + 1}
                            </h5>
                            <Controller
                              name={`eventContributors.${index}.isHeadliner`}
                              control={control}
                              render={({ field: headlinerField }) => (
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={headlinerField.value}
                                    onChange={headlinerField.onChange}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                      headlinerField.value
                                        ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    <Star
                                      className={`w-4 h-4 ${headlinerField.value ? "text-white" : "text-gray-400"}`}
                                    />
                                    <span>Headliner</span>
                                  </div>
                                </label>
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeContributor(index);
                              clearErrors(`eventContributors.${index}`);
                            }}
                            className="w-8 h-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Photo Upload Section */}
                          <div className="lg:col-span-1">
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
                              Profile Photo
                            </Label>

                            <div className="space-y-3">
                              <label
                                htmlFor={`photo-upload-${index}`}
                                className="w-32 h-32 mx-auto lg:mx-0 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors group cursor-pointer"
                              >
                                {contributorsValues?.[index]?.photo ? (
                                  typeof contributorsValues[index].photo ===
                                  "string" ? (
                                    <img
                                      src={contributorsValues[index].photo}
                                      alt="Contributor"
                                      className="w-full h-full object-cover rounded-2xl"
                                    />
                                  ) : (
                                    <img
                                      src={URL.createObjectURL(
                                        contributorsValues[index].photo
                                      )}
                                      alt="Contributor"
                                      className="w-full h-full object-cover rounded-2xl"
                                    />
                                  )
                                ) : (
                                  <div className="text-center">
                                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500 group-hover:text-indigo-600">
                                      Upload Photo
                                    </p>
                                  </div>
                                )}
                              </label>

                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`photo-upload-${index}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setValue(
                                      `eventContributors.${index}.photo`,
                                      file,
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      }
                                    );
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Form Fields */}
                          <div className="lg:col-span-2 space-y-6">
                            <div>
                              <Label
                                htmlFor={`eventContributors.${index}.name`}
                                className="text-sm font-medium text-gray-700"
                              >
                                Full Name *
                              </Label>
                              <Input
                                id={`eventContributors.${index}.fullname`}
                                placeholder="Enter contributor's full name"
                                {...register(
                                  `eventContributors.${index}.fullname`
                                )}
                                className="mt-2 h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-400"
                              />
                              {errors.eventContributors?.[index]?.fullname && (
                                <p className="text-sm text-red-500 mt-2 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {
                                    errors.eventContributors[index].fullname
                                      .message
                                  }
                                </p>
                              )}
                            </div>

                            <div>
                              <Label
                                htmlFor={`eventContributors.${index}.role`}
                                className="text-sm font-medium text-gray-700"
                              >
                                Role & Title *
                              </Label>
                              <Input
                                id={`eventContributors.${index}.role`}
                                placeholder="e.g., Keynote Speaker, Master of Ceremonies, Featured Artist"
                                {...register(`eventContributors.${index}.role`)}
                                className="mt-2 h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 placeholder-gray-400"
                              />
                              {errors.eventContributors?.[index]?.role && (
                                <p className="text-sm text-red-500 mt-2 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {errors.eventContributors[index].role.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Contributor Button */}
                    <Button
                      type="button"
                      onClick={() =>
                        appendContributor({
                          fullname: "",
                          photo: "",
                          role: "",
                          isHeadliner: false,
                        })
                      }
                      className="w-full h-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium"
                    >
                      <UserPlus className="w-6 h-6 mr-3" />
                      Add New Contributor
                    </Button>

                    {/* Status Messages */}
                    <div className="space-y-4">
                      {contributorFields.length === 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Info className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h6 className="font-semibold text-blue-900 mb-1">
                                No Contributors Added Yet
                              </h6>
                              <p className="text-sm text-blue-700 leading-relaxed">
                                Add speakers, performers, hosts, or other key
                                contributors to showcase them prominently on
                                your event page. This helps attendees know who
                                they'll be learning from or seeing perform.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {contributorsValues?.some(
                        (contributor) => contributor.isHeadliner
                      ) && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h6 className="font-semibold text-yellow-900 mb-1">
                                ⭐{" "}
                                {
                                  contributorsValues.filter(
                                    (c) => c.isHeadliner
                                  ).length
                                }{" "}
                                Headliner
                                {contributorsValues.filter((c) => c.isHeadliner)
                                  .length > 1
                                  ? "s"
                                  : ""}{" "}
                                Selected
                              </h6>
                              <p className="text-sm text-yellow-700 leading-relaxed">
                                These contributors will be featured prominently
                                at the top of your event page and in promotional
                                materials to attract more attendees.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Ticket Types */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    {/* Ticket Fields */}
                    {ticketFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-indigo-600">
                                {index + 1}
                              </span>
                            </div>
                            <h5 className="text-lg font-semibold text-gray-900">
                              Ticket Type {index + 1}
                            </h5>
                          </div>
                          {ticketFields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                removeTicket(index);
                                clearErrors(`ticketTypes.${index}`);
                              }}
                              className="text-gray-400 hover:text-red-500 border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`ticketTypes.${index}.name`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Ticket Name
                            </Label>
                            <Input
                              id={`ticketTypes.${index}.name`}
                              {...register(`ticketTypes.${index}.name`)}
                              className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-lg"
                              placeholder="e.g., General Admission"
                            />
                            {errors.ticketTypes?.[index]?.name && (
                              <p className="text-sm text-red-500 mt-1 flex items-center">
                                <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                                {errors.ticketTypes[index].name.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`ticketTypes.${index}.price`}
                              className="text-sm font-medium text-gray-700"
                            >
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
                                  className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-lg"
                                />
                              )}
                            />
                            {errors.ticketTypes?.[index]?.price && (
                              <p className="text-sm text-red-500 mt-1 flex items-center">
                                <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                                {errors.ticketTypes[index].price.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`ticketTypes.${index}.totalQuantity`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Quantity
                            </Label>
                            <Input
                              id={`ticketTypes.${index}.totalQuantity`}
                              type="number"
                              {...register(
                                `ticketTypes.${index}.totalQuantity`,
                                {
                                  valueAsNumber: true,
                                }
                              )}
                              className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-lg"
                              placeholder="100"
                            />
                            {errors.ticketTypes?.[index]?.totalQuantity && (
                              <p className="text-sm text-red-500 mt-1 flex items-center">
                                <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
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

                    {/* Add Ticket Button */}
                    <Button
                      type="button"
                      onClick={() =>
                        appendTicket({
                          name: "",
                          price: 0,
                          totalQuantity: 1,
                        })
                      }
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add Another Ticket Type
                    </Button>

                    {/* Status Alerts */}
                    <div className="space-y-4">
                      {ticketFields.length === 0 && (
                        <div
                          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                          role="alert"
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="ml-3">
                              <p className="font-semibold text-amber-800">
                                No Tickets Found
                              </p>
                              <p className="text-sm text-amber-700 mt-1">
                                Your event needs at least one ticket type to
                                publish. It will only be in draft mode.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {ticketFields.length > 0 &&
                        ticketTypesValues?.every(
                          (ticket) => ticket.price === 0
                        ) && (
                          <div
                            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                            role="alert"
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <Info className="h-5 w-5 text-blue-500" />
                              </div>
                              <div className="ml-3">
                                <p className="font-semibold text-blue-800">
                                  Free Event
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                  All tickets are free. This event will be
                                  marked as free for everyone.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Featured Checkbox */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Input
                        type="checkbox"
                        id="isFeatured"
                        {...register("isFeatured")}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <Label
                          htmlFor="isFeatured"
                          className="text-sm font-medium text-gray-900"
                        >
                          Mark as Featured
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Featured events get highlighted placement and
                          increased visibility
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="flex items-center p-6 border-t border-gray-200">
              <DialogClose asChild>
                <Button variant="outline" onClick={handlCancel}>
                  Cancel
                </Button>
              </DialogClose>

              <div className="flex ml-auto space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                {currentStep < 4 ? (
                  <Button
                    disabled={Object.values(errors).length > 0 || !isDirty}
                    type="button"
                    onClick={handleNextStep}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    disabled={
                      Object.values(errors).length > 0 ||
                      isCreating ||
                      isSubmitting
                    }
                    type="submit"
                    onClick={handleSubmit(onFinalSubmit)}
                  >
                    {isCreating || isSubmitting
                      ? "Creating..."
                      : "Create Event"}
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

const handleThumbnails = async (userID: string, images) => {
  const files = images.map((img) => {
    return img.file;
  });

  const uploadPromises = files.map((file) =>
    EventManagementService.uploadThumbnails({ userID, file })
  );

  const imageUrls = await Promise.all(uploadPromises);
  return imageUrls;
};
