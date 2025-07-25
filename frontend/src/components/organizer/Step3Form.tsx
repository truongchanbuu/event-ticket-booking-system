import React from "react";
import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { FormSection } from "./FormSection";
import { ControlledInput } from "./ControlledInput";
import { ControlledTagInput } from "./ControlledTagInput";

export const Step3FormValidation = () => {
  const { watch, formState } = useFormContext();

  const type = watch("type");
  const eventLicense = watch("eventLicense"); // Kiểm tra xem file này có tồn tại không

  return (
    <div className="space-y-8">
      <div>{JSON.stringify(formState.errors)}</div>
      {/* === KHU VỰC 1: XÁC MINH DANH TÍNH (TỪ CCCD) === */}
      <FormSection
        title="Identity Verification"
        description="Please confirm the details extracted from your ID card. Edit if necessary."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
          <ControlledInput name="fullName" label="Full Name" required />
          <ControlledInput name="idNumber" label="ID Number" required />
          <ControlledInput name="dateOfBirth" label="Date of Birth" required />
          <ControlledInput
            name="permanentAddress"
            label="Permanent Address"
            required
          />
          <ControlledInput name="dateOfIssue" label="Date of Issue" required />
          <ControlledInput
            name="placeOfIssue"
            label="Place of Issue"
            required
          />
        </div>
      </FormSection>

      {/* === KHU VỰC 2: XÁC MINH DOANH NGHIỆP (TỪ GPKD) === */}
      {type === "business" && (
        <FormSection
          title="Business Verification"
          description="Please confirm the details from your business license."
        >
          {/* Bạn có thể thêm ảnh preview của GPKD ở đây nếu muốn */}
          <div className="space-y-6">
            <ControlledInput
              name="businessName"
              label="Legal Company Name"
              required
            />
            <ControlledInput
              name="businessCode"
              label="Business Code"
              required
            />
            <ControlledInput name="address" label="Business Address" required />
            <ControlledInput
              name="legalRepresentative"
              label="Legal Representative"
            />
            <ControlledInput
              name="dateOfIssue"
              label="License Date of Issue"
              required
            />
            <ControlledTagInput
              label="Business Sectors"
              name="businessSectors"
            />
            <ControlledInput
              name="placeOfIssue"
              label="License Place of Issue"
              required
            />
          </div>
        </FormSection>
      )}

      {/* === KHU VỰC 3: XÁC MINH GIẤY PHÉP SỰ KIỆN (TÙY CHỌN) === */}
      {Boolean(eventLicense) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FormSection
            title="Event Permit Verification"
            description="Please confirm the details from your event organization permit."
          >
            {/* Bạn có thể thêm ảnh preview của Giấy phép sự kiện ở đây */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <ControlledInput name="eventName" label="Event Name" required />
              <ControlledInput
                name="organizerName"
                label="Organizer Name (on permit)"
                required
              />
              <ControlledInput name="eventDate" label="Event Date" required />
              <ControlledInput
                name="location"
                label="Event Location"
                required
              />
              <ControlledInput
                name="issueDate"
                label="Permit Issue Date"
                required
              />
              <ControlledInput
                name="issuedBy"
                label="Issuing Authority"
                required
              />
            </div>
          </FormSection>
        </motion.div>
      )}
    </div>
  );
};
