import React from "react";
import { motion } from "framer-motion";
import { Shield, Check } from "lucide-react";

interface FormHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export default function ApplicationFormHeader({
  currentStep,
  totalSteps,
}: FormHeaderProps) {
  const stepLabels = ["Information", "Documents", "Document Validation"];
  return (
    <>
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
    </>
  );
}
