import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export function PriceField() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const watchedPrice = watch("price");
  const [displayValue, setDisplayValue] = useState("0 ₫");

  useEffect(() => {
    if (typeof watchedPrice === "number") {
      setDisplayValue(formatCurrency(watchedPrice));
    }
  }, [watchedPrice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, "");
    const numeric = parseInt(rawValue || "0", 10);

    setValue("price", numeric, { shouldValidate: true, shouldDirty: true });
    setDisplayValue(formatCurrency(numeric));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Price *
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="0 ₫"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {watchedPrice === 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-yellow-50 p-2 border border-yellow-300">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-700">
            This ticket is Free! <strong>(0 ₫)</strong>
          </p>
        </div>
      )}
      {typeof errors.price?.message === "string" && (
        <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
      )}
    </div>
  );
}
