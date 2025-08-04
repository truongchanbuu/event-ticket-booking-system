import React from "react";
import { LucideIcon } from "lucide-react";

interface InputFieldProps {
  icon: LucideIcon;
  type: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  icon: Icon,
  type,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  required = true,
  className = "",
  error,
  disabled = false,
}) => {
  return (
    <div className="relative group">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Icon
            className={`h-5 w-5 transition-colors ${
              error
                ? "text-red-500"
                : "text-gray-400 group-focus-within:text-blue-500"
            }`}
          />
        </div>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-200 focus:ring-blue-500"
          } ${className}`}
        />
      </div>
      {error && (
        <div className="mt-1.5 flex items-center space-x-1">
          <div className="w-1 h-1 bg-red-500 rounded-full"></div>
          <p className="text-red-500 text-xs font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
