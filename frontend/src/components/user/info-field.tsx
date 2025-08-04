import { useMemo } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { formatDate } from "@/lib/utils";

// Định nghĩa lại Props cho đơn giản
interface InfoFieldProps extends React.ComponentProps<typeof Input> {
  label: React.ReactNode;
  isEditing: boolean;
  displayValue?: string | number | null;
  children?: React.ReactNode;
}

export const InfoField: React.FC<InfoFieldProps> = ({
  label,
  isEditing,
  displayValue,
  children,
  type,
  ...props // props này sẽ chứa TOÀN BỘ {...register}
}) => {
  // Logic này chỉ dùng để hiển thị, không ảnh hưởng đến input
  const finalDisplayValue = useMemo(() => {
    if (type === "date" && displayValue) {
      return formatDate(String(displayValue));
    }
    return displayValue ?? "N/A";
  }, [type, displayValue]);

  return (
    <div>
      <Label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
        {label}
      </Label>
      {isEditing ? (
        <Input
          type={type}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          {...props}
        />
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-gray-900 py-2">{finalDisplayValue}</p>
          {children}
        </div>
      )}
    </div>
  );
};
