import React from "react";
import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { FormSection } from "./FormSection";
import { ControlledDocumentUploader } from "./ControlledDocumentUploader";

export const Step2FormDocuments = () => {
  const { watch } = useFormContext();
  const selectedType = watch("type");

  return (
    <FormSection
      title="Required Documents"
      description="Please upload the following documents for verification."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ControlledDocumentUploader
            name="identityCardFront"
            label="Front of Identity Card"
            required
          />
          <ControlledDocumentUploader
            name="identityCardBack"
            label="Back of Identity Card"
            required
          />
        </div>

        {selectedType === "business" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden" // Thêm để animation mượt hơn
          >
            <ControlledDocumentUploader
              name="businessLicense"
              label="Business License"
              required
            />
          </motion.div>
        )}

        <ControlledDocumentUploader
          name="eventLicense"
          label="Event Organization Permit (Optional)"
          required={false}
        />
      </div>
    </FormSection>
  );
};
