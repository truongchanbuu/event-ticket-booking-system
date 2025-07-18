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
import { useForm, Controller } from "react-hook-form";
import { OrganizerType } from "@/schema";
import { Button } from "../ui/button";
import DocumentUploader from "./DocumentUploader";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface ApplyOrganizerFormProps {
  onSubmit: (data: any) => void | Promise<void>;
  loading?: boolean;
  defaultType?: OrganizerType;
}

export const ApplyOrganizerForm: React.FC<ApplyOrganizerFormProps> = ({
  onSubmit,
  loading,
  defaultType = "personal",
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      type: defaultType,
      identityCardFront: undefined,
      identityCardBack: undefined,
      businessLicense: undefined,
      eventLicense: undefined,
      bio: "",
      websiteUrl: "",
      facebookUrl: "",
      instagramUrl: "",
      xUrl: "",
    },
    mode: "onChange",
  });

  const selectedType = watch("type");
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 2;

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const processSubmit = (data: any) => {
    onSubmit(data);
  };

  const stepLabels = ["Information", "Documents"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-3 sm:px-4 lg:px-6">
      <div className="w-full max-w-6xl mx-auto sm:py-4 lg:py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-3 sm:mb-4">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Organizer Application
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            Apply to become an event organizer on our platform
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center max-w-md mx-auto">
            {[1, 2].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: currentStep === step ? 1.1 : 1,
                      backgroundColor:
                        currentStep >= step ? "#2563eb" : "#e5e7eb",
                    }}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep >= step
                        ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                        : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {currentStep > step ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-sm font-medium">
                        {step}
                      </span>
                    )}
                  </motion.div>
                  <span className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2 font-medium">
                    {stepLabels[index]}
                  </span>
                </div>
                {index < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 sm:mx-4 transition-all ${
                      currentStep > step ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <motion.form
          onSubmit={handleSubmit(processSubmit)}
          className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Organizer Information
                  </h3>

                  {/* Enhanced Type Selection */}
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                        <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex items-center p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all ${
                            field.value === "personal"
                              ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <input
                            type="radio"
                            onBlur={field.onBlur}
                            onChange={() => field.onChange("personal")}
                            checked={field.value === "personal"}
                            name={field.name}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3 sm:gap-4 w-full">
                            <div
                              className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${
                                field.value === "personal"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              <User
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  field.value === "personal"
                                    ? "text-blue-600"
                                    : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm sm:text-base">
                                Personal
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Individual organizer
                              </div>
                            </div>
                          </div>
                        </motion.label>

                        <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex items-center p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all ${
                            field.value === "business"
                              ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <input
                            type="radio"
                            onBlur={field.onBlur}
                            onChange={() => field.onChange("business")}
                            checked={field.value === "business"}
                            name={field.name}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3 sm:gap-4 w-full">
                            <div
                              className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${
                                field.value === "business"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              <Building2
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  field.value === "business"
                                    ? "text-blue-600"
                                    : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm sm:text-base">
                                Business
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Company or organization
                              </div>
                            </div>
                          </div>
                        </motion.label>
                      </div>
                    )}
                  />

                  {/* Enhanced Bio Field */}
                  <div>
                    <Label className="block text-sm font-medium mb-2 text-gray-700">
                      Bio <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="bio"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Textarea
                            {...field}
                            rows={4}
                            maxLength={500}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                            placeholder="Tell us about yourself or your organization..."
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                            {field.value?.length || 0}/500
                          </div>
                        </div>
                      )}
                    />
                  </div>

                  {/* Enhanced URL Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <Label className="block text-sm font-medium mb-2 text-gray-700">
                        Website URL
                      </Label>
                      <Controller
                        name="websiteUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder="https://yourwebsite.com"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2 text-gray-700">
                        Facebook
                      </Label>
                      <Controller
                        name="facebookUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder="Facebook URL"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2 text-gray-700">
                        Instagram
                      </Label>
                      <Controller
                        name="instagramUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder="Instagram URL"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2 text-gray-700">
                        X (Twitter)
                      </Label>
                      <Controller
                        name="xUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder="X (Twitter) URL"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    Required Documents
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

          {/* Enhanced Navigation */}
          <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="px-4 sm:px-6 text-sm sm:text-base"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isValid}
                  className="px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base min-w-[120px]"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
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
  );
};

export default ApplyOrganizerForm;
