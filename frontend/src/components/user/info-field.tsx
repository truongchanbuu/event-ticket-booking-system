import { useMemo } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { formatDate } from "@/lib/utils";

interface InfoFieldProps {
  label: React.ReactNode;
  isEditing: boolean;
  value: string | number | undefined | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; // e.g. "text", "tel", "date"
  children?: React.ReactNode; // e.g. status badges
}

export const InfoField: React.FC<InfoFieldProps> = ({
  label,
  isEditing,
  value,
  onChange,
  type = "text",
  children,
}) => {
  const inputValue = useMemo(() => {
    if (type === "date" && value) {
      try {
        // Accept ISO or raw YYYY-MM-DD; reformat to date-only string.
        const d = new Date(String(value));
        if (!isNaN(d.getTime())) {
          return d.toISOString().split("T")[0];
        }
        // fallback: assume already date-only
        return String(value);
      } catch {
        return "";
      }
    }
    return value ?? "";
  }, [type, value]);

  const displayValue = useMemo(() => {
    if (type === "date" && value) {
      return formatDate(String(value));
    }
    return value ?? "N/A";
  }, [type, value]);

  return (
    <div>
      <Label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
        {label}
      </Label>
      {isEditing ? (
        <Input
          type={type}
          value={inputValue}
          onChange={onChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-gray-900 py-2">{displayValue}</p>
          {children}
        </div>
      )}
    </div>
  );
};
