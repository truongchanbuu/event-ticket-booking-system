import React from "react";
import { FormSection } from "./FormSection";
import { TypeSelection } from "./TypeSelection";
import { ControlledInput } from "./ControlledInput";
import { ControlledTextarea } from "./ControlledTextarea";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";

const urlFields = ["website", "facebook", "instagram", "x"] as const;

export const Step1FormInfo = () => {
  return (
    <div className="space-y-8">
      <FormSection title="Organizer Type" description="Choose your role.">
        <TypeSelection name="type" />
      </FormSection>

      <FormSection
        title="Organizer Details"
        description="Tell us about yourself."
      >
        <ControlledInput
          name="orgName"
          label="Organizer Name"
          required
          placeholder="Your Brand Name"
          className="mb-5"
        />
        <ControlledTextarea
          name="bio"
          label="Bio"
          required
          placeholder="A brief description..."
        />
      </FormSection>

      <FormSection
        title="Social Links"
        description="Let us know where to find you."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {urlFields.map((field) => (
            <ControlledInput
              key={field}
              name={field}
              label={toUpperCaseFirstLetter(field)}
              type="url"
              required={false}
            />
          ))}
        </div>
      </FormSection>
    </div>
  );
};
