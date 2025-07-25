import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

interface ControlledInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  required?: boolean;
}

export const ControlledInput: React.FC<ControlledInputProps> = ({
  name,
  label,
  required,
  ...props
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error, isTouched } }) => (
        <div className="w-full space-y-2">
          <Label htmlFor={name} className="font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={name}
            {...field}
            {...props}
            className={`w-full ${
              error && isTouched
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            } ${props.className || ""}`}
          />
          <FieldError message={error?.message} isTouched={isTouched} />
        </div>
      )}
    />
  );
};
