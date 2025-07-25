"use client";

import React from "react";
import { FormProvider } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { useApplyOrganizerWizard } from "@/hooks/use-apply-organizer-form-wizard";

import { FormNavigation } from "./FormNavigation";
import { ApplyOrganizerFormData } from "@/schema";
import ApplicationFormHeader from "./FormHeader";
import { Step1FormInfo } from "./Step1Form";
import { Step2FormDocuments } from "./Step2Form";
import { Step3FormValidation } from "./Step3Form";

interface ApplyOrganizerFormProps {
  onSubmit: (data: ApplyOrganizerFormData) => void | Promise<void>;
  loading?: boolean;
}

const stepComponents = [Step1FormInfo, Step2FormDocuments, Step3FormValidation];

export const ApplyOrganizerForm: React.FC<ApplyOrganizerFormProps> = ({
  onSubmit,
  loading,
}) => {
  const wizard = useApplyOrganizerWizard();
  const CurrentStepComponent = stepComponents[wizard.currentStep];

  return (
    <FormProvider {...wizard.methods}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-3 sm:px-4 lg:px-6">
        <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 lg:py-12">
          <ApplicationFormHeader
            currentStep={wizard.currentStep}
            totalSteps={wizard.totalSteps}
          />

          <motion.form
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-6 sm:p-8 lg:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizard.currentStep}
                  initial={{
                    opacity: 0,
                    x:
                      wizard.currentStep > (wizard.previousStep || 0)
                        ? 30
                        : -30,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x:
                      wizard.currentStep > (wizard.previousStep || 0)
                        ? -30
                        : 30,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <CurrentStepComponent />
                </motion.div>
              </AnimatePresence>
            </div>

            <FormNavigation
              wizard={wizard}
              loading={loading}
              onSubmit={onSubmit}
            />
          </motion.form>
        </div>
      </div>
    </FormProvider>
  );
};
