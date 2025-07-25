// components/apply-form/fields/TypeSelection.tsx

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { User, Building2 } from "lucide-react";
import { Input } from "../ui/input";
import { FieldError } from "../ui/field-error";

interface SelectionCardProps {
  value: "personal" | "business";
  label: string;
  description: string;
  icon: React.ReactNode;
  field: any;
}

const SelectionCard: React.FC<SelectionCardProps> = ({
  value,
  label,
  description,
  icon,
  field,
}) => {
  const isSelected = field.value === value;
  return (
    <motion.label
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <Input
        type="radio"
        onBlur={field.onBlur}
        onChange={() => field.onChange(value)}
        checked={isSelected}
        name={field.name}
        className="sr-only" // Ẩn radio button gốc
      />
      <div className="flex items-center gap-4 w-full">
        <div
          className={`p-3 rounded-full flex-shrink-0 ${
            isSelected ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="font-medium text-gray-900">{label}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      </div>
    </motion.label>
  );
};

interface TypeSelectionProps {
  name: string;
}

export const TypeSelection: React.FC<TypeSelectionProps> = ({ name }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectionCard
              value="personal"
              label="Personal"
              description="Individual organizer"
              icon={
                <User
                  className={`w-6 h-6 ${
                    field.value === "personal"
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                />
              }
              field={field}
            />
            <SelectionCard
              value="business"
              label="Business"
              description="Company or organization"
              icon={
                <Building2
                  className={`w-6 h-6 ${
                    field.value === "business"
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                />
              }
              field={field}
            />
          </div>
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
};
