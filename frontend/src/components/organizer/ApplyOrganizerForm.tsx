"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  User,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { Controller, FormProvider } from "react-hook-form";
import { useApplyOrganizerWizard } from "@/hooks/use-apply-organizer-form-wizard";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import DocumentUploader from "./DocumentUploader";

// Component con để hiển thị lỗi gọn gàng, có thể tái sử dụng
const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return <p className="mt-1.5 text-sm font-medium text-red-600">{message}</p>;
};

interface ApplyOrganizerFormProps {
  onSubmit: (data: any) => void | Promise<void>;
  loading?: boolean;
}

export const ApplyOrganizerForm: React.FC<ApplyOrganizerFormProps> = ({
  onSubmit,
  loading,
}) => {
  // 1. TOÀN BỘ LOGIC FORM ĐẾN TỪ MỘT HOOK DUY NHẤT
  const {
    methods,
    currentStep,
    totalSteps,
    isLast,
    goNext,
    goPrev,
    submitAll,
  } = useApplyOrganizerWizard();

  const {
    control,
    watch,
    formState: { errors, isValid },
  } = methods;
  const selectedType = watch("type");
  const stepLabels = ["Information", "Documents"];

  return (
    // 2. FormProvider truyền context của form xuống các component con
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-3 sm:px-4 lg:px-6">
        <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 lg:py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Organizer Application
            </h1>
            <p className="text-base text-gray-600">
              Apply to become an event organizer on our platform
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center max-w-md mx-auto">
              {stepLabels.map((label, index) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: currentStep === index ? 1.1 : 1,
                        backgroundColor:
                          currentStep >= index ? "#2563eb" : "#e5e7eb",
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentStep >= index ? "border-blue-600 bg-blue-600 text-white shadow-lg" : "border-gray-300 text-gray-500"}`}
                    >
                      {currentStep > index ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="font-medium">{index + 1}</span>
                      )}
                    </motion.div>
                    <span className="text-sm text-gray-600 mt-2 font-medium w-20">
                      {label}
                    </span>
                  </div>
                  {index < totalSteps - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-all ${currentStep > index ? "bg-blue-600" : "bg-gray-300"}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 3. Form được kết nối với hook qua submitAll */}
          <motion.form
            onSubmit={submitAll(onSubmit)}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-6 sm:p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <h3 className="text-xl font-semibold text-gray-900">
                      Organizer Information
                    </h3>

                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Selection Card: Personal */}
                            <motion.label
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${field.value === "personal" ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                            >
                              <input
                                type="radio"
                                onBlur={field.onBlur}
                                onChange={() => field.onChange("personal")}
                                checked={field.value === "personal"}
                                name={field.name}
                                className="sr-only"
                              />
                              <div className="flex items-center gap-4 w-full">
                                <div
                                  className={`p-3 rounded-full flex-shrink-0 ${field.value === "personal" ? "bg-blue-100" : "bg-gray-100"}`}
                                >
                                  <User
                                    className={`w-6 h-6 ${field.value === "personal" ? "text-blue-600" : "text-gray-600"}`}
                                  />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    Personal
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Individual organizer
                                  </div>
                                </div>
                              </div>
                            </motion.label>
                            {/* Selection Card: Business */}
                            <motion.label
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${field.value === "business" ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                            >
                              <input
                                type="radio"
                                onBlur={field.onBlur}
                                onChange={() => field.onChange("business")}
                                checked={field.value === "business"}
                                name={field.name}
                                className="sr-only"
                              />
                              <div className="flex items-center gap-4 w-full">
                                <div
                                  className={`p-3 rounded-full flex-shrink-0 ${field.value === "business" ? "bg-blue-100" : "bg-gray-100"}`}
                                >
                                  <Building2
                                    className={`w-6 h-6 ${field.value === "business" ? "text-blue-600" : "text-gray-600"}`}
                                  />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    Business
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Company or organization
                                  </div>
                                </div>
                              </div>
                            </motion.label>
                          </div>
                          <FieldError
                            message={errors.type?.message?.toString()}
                          />
                        </div>
                      )}
                    />

                    <div>
                      <Label htmlFor="bio" className="font-medium">
                        Bio <span className="text-red-500">*</span>
                      </Label>
                      <Controller
                        name="bio"
                        control={control}
                        render={({ field }) => (
                          <>
                            <div className="relative mt-2">
                              <Textarea
                                {...field}
                                id="bio"
                                rows={4}
                                maxLength={500}
                                className={`w-full resize-none ${errors.bio ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                                placeholder="Tell us about yourself or your organization..."
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                {field.value?.length || 0}/500
                              </div>
                            </div>
                            <FieldError
                              message={errors.bio?.message?.toString()}
                            />
                          </>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                      {/* URL Fields with Error Handling */}
                      {(
                        [
                          "websiteUrl",
                          "facebookUrl",
                          "instagramUrl",
                          "xUrl",
                        ] as const
                      ).map((urlField) => (
                        <div key={urlField}>
                          <Label
                            htmlFor={urlField}
                            className="font-medium capitalize"
                          >
                            {urlField
                              .replace("Url", " URL")
                              .replace("x ", "X ")}
                          </Label>
                          <Controller
                            name={urlField}
                            control={control}
                            render={({ field }) => (
                              <>
                                <input
                                  {...field}
                                  id={urlField}
                                  type="url"
                                  placeholder={`https://your${urlField.replace("Url", "")}.com`}
                                  className={`w-full mt-2 border rounded-lg px-4 py-2 ${errors[urlField] ? "border-red-500" : "border-gray-300"}`}
                                />
                                <FieldError
                                  message={errors[
                                    urlField
                                  ]?.message?.toString()}
                                />
                              </>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <h3 className="text-xl font-semibold text-gray-900">
                      Required Documents
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Controller
                        name="identityCardFront"
                        control={control}
                        render={({ field }) => (
                          <DocumentUploader
                            label="Front of Identity Card"
                            required
                            value={field.value || null}
                            onChange={field.onChange}
                            error={errors.identityCardFront?.message?.toString()}
                          />
                        )}
                      />
                      <Controller
                        name="identityCardBack"
                        control={control}
                        render={({ field }) => (
                          <DocumentUploader
                            label="Back of Identity Card"
                            required
                            value={field.value || null}
                            onChange={field.onChange}
                            error={errors.identityCardBack?.message?.toString()}
                          />
                        )}
                      />
                    </div>
                    {selectedType === "business" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Controller
                          name="businessLicense"
                          control={control}
                          render={({ field }) => (
                            <DocumentUploader
                              label="Business License"
                              required
                              value={field.value || null}
                              onChange={field.onChange}
                              error={errors.businessLicense?.message?.toString()}
                            />
                          )}
                        />
                      </motion.div>
                    )}
                    <Controller
                      name="eventLicense"
                      control={control}
                      render={({ field }) => (
                        <DocumentUploader
                          label="Event Organization Permit (Optional)"
                          value={field.value || null}
                          onChange={field.onChange}
                          error={errors.eventLicense?.message?.toString()}
                        />
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                {currentStep > 0 ? (
                  <Button type="button" variant="outline" onClick={goPrev}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                {!isLast ? (
                  <Button type="button" onClick={goNext} disabled={!isValid}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || !isValid}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      </div>
    </FormProvider>
  );
};
