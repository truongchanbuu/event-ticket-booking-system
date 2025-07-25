import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "../ui/field-error";
import { cn } from "@/lib/utils";

interface ControlledTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label: string;
  required?: boolean;
}

export const ControlledTextarea: React.FC<ControlledTextareaProps> = ({
  name,
  label,
  required,
  className,
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
  } = useFormContext();

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative">
            <Textarea
              {...field}
              id={name}
              className={cn(
                "w-full resize-none border-gray-300 focus:ring-blue-500",
                errors[name] &&
                  touchedFields[name] &&
                  "border-red-500 focus:ring-red-500",
                className
              )}
              {...props}
            />
          </div>
        )}
      />

      <FieldError
        message={errors[name]?.message?.toString()}
        isTouched={touchedFields[name]}
      />
    </div>
  );
};
