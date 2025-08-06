import { supportedCurrencies } from "@/constants/user";
import { useFormContext } from "react-hook-form";

export function CurrencySelect() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="mb-4">
      <label
        htmlFor="currency"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Currency *
      </label>

      <select
        {...register("currency")}
        id="currency"
        defaultValue=""
        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition
          ${errors.currency ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="" disabled>
          -- Select currency --
        </option>
        {supportedCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} – {c.label}
          </option>
        ))}
      </select>

      {errors.currency && typeof errors.currency.message === "string" && (
        <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
      )}
    </div>
  );
}
