import React, { useState, KeyboardEvent } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { X, Plus } from "lucide-react";

interface ControlledTagInputProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export const ControlledTagInput: React.FC<ControlledTagInputProps> = ({
  name,
  label,
  placeholder,
  required,
}) => {
  const { control } = useFormContext();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error, isTouched } }) => {
        const tags = field.value || [];

        const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
              field.onChange([...tags, inputValue.trim()]);
            }
            setInputValue("");
          }
        };

        const removeTag = (index: number) => {
          const updated = tags.filter((_, i) => i !== index);
          field.onChange(updated);
        };

        const addTag = () => {
          if (inputValue.trim() && !tags.includes(inputValue.trim())) {
            field.onChange([...tags, inputValue.trim()]);
            setInputValue("");
          }
        };

        return (
          <div className="space-y-3">
            <Label htmlFor={name} className="text-sm font-medium text-gray-700">
              {label} {required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {/* Tags Container */}
            <div className="min-h-[40px] p-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-blue-400">
              {/* Tags Display */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag: string, index: number) => (
                    <div
                      key={index}
                      className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full px-3 py-1.5 text-sm flex items-center shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 animate-in fade-in slide-in-from-left-2"
                    >
                      <span className="select-none">{tag}</span>
                      <button
                        type="button"
                        className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                        onClick={() => removeTag(index)}
                        aria-label={`Remove ${tag} tag`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id={name}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={
                    tags.length === 0 ? placeholder : "Add another tag..."
                  }
                  className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400"
                />

                {inputValue.trim() && (
                  <button
                    type="button"
                    onClick={addTag}
                    className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200 animate-in fade-in zoom-in-75"
                    aria-label="Add tag"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Helper Text */}
            {isFocused && !error && (
              <p className="text-xs text-gray-500 animate-in fade-in slide-in-from-top-1">
                Press Enter or click + to add a tag
              </p>
            )}

            <FieldError message={error?.message} isTouched={isTouched} />
          </div>
        );
      }}
    />
  );
};
