import { classNames } from "@/lib/components/classname-utils";
import { Provider } from "@/schema";

export function ProviderPicker({
  value,
  onChange,
  disabled,
}: {
  value: Provider;
  onChange: (v: Provider) => void;
  disabled?: boolean;
}) {
  const opts: Array<{
    key: Provider;
    label: string;
    hint?: string;
    available: boolean;
  }> = [
    {
      key: "momo",
      label: "MoMo",
      hint: "Scan QR to pay instantly",
      available: true,
    },
    // { key: "zalopay", label: "ZaloPay", hint: "Quick QR payment", available: false },
    // { key: "stripe", label: "Credit Card", hint: "Via Stripe (redirects)", available: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {opts.map((o) => (
          <label
            key={o.key}
            className={classNames(
              "relative flex items-center gap-4 rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 group",
              value === o.key && o.available
                ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md ring-2 ring-indigo-200"
                : o.available
                  ? "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                  : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <div
              className={classNames(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                value === o.key && o.available
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 group-hover:border-indigo-400"
              )}
            >
              {value === o.key && o.available && (
                <div className="w-2 h-2 bg-white rounded-full animate-scale-in"></div>
              )}
            </div>

            <div className="flex-grow">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-gray-900">
                  {o.label}
                </span>
                {o.key === "momo" && (
                  <div className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                    Recommended
                  </div>
                )}
                {!o.available && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
              {o.hint && <p className="text-sm text-gray-500 mt-1">{o.hint}</p>}
            </div>

            <input
              type="radio"
              name="provider"
              value={o.key}
              className="sr-only"
              checked={value === o.key}
              onChange={() => o.available && onChange(o.key)}
              disabled={disabled || !o.available}
            />

            {!o.available && (
              <div className="absolute inset-0 rounded-2xl bg-gray-50 bg-opacity-75 flex items-center justify-center">
                <span className="text-gray-400 text-sm font-medium">
                  Coming Soon
                </span>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
