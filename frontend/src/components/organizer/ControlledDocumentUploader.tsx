// components/apply-form/fields/ControlledDocumentUploader.tsx

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { isFileValue } from "@/lib/helpers/file.helper";
import DocumentUploader, { DocumentUploaderProps } from "./DocumentUploader";
import { FileValue } from "@/schema/common";

interface ControlledDocumentUploaderProps
  extends Omit<DocumentUploaderProps, "value" | "onChange" | "error"> {
  name: string;
}

export const ControlledDocumentUploader: React.FC<
  ControlledDocumentUploaderProps
> = ({ name, ...props }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({
        field: { onChange, value },
        fieldState: { error, isTouched },
      }) => {
        const safeValue = isFileValue(value) ? (value as FileValue) : null;
        const errorMessage = isTouched ? error?.message : undefined;

        return (
          <DocumentUploader
            {...props}
            value={safeValue}
            onChange={onChange}
            error={errorMessage}
          />
        );
      }}
    />
  );
};
