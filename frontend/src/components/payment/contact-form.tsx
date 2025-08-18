import { classNames } from "@/lib/components/classname-utils";
import { Buyer } from "@/schema";

export function ContactForm({
  buyer,
  setBuyer,
  disabled,
  errors,
}: {
  buyer: Buyer;
  setBuyer: (b: Buyer) => void;
  disabled?: boolean;
  errors: Partial<Record<keyof Buyer, string>>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-900">
          Contact Information
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              className={classNames(
                "w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 outline-none",
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 bg-white hover:border-gray-300"
              )}
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              disabled={disabled}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </div>
          </div>
          {errors.email && (
            <p
              id="email-error"
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0123456789"
              className={classNames(
                "w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 outline-none",
                errors.phone
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 bg-white hover:border-gray-300"
              )}
              value={buyer.phone}
              onChange={(e) =>
                setBuyer({
                  ...buyer,
                  phone: e.target.value.replace(/\D+/g, ""),
                })
              }
              disabled={disabled}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
          </div>
          {errors.phone && (
            <p
              id="phone-error"
              className="text-xs text-red-600 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.phone}</span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Full Name <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="relative">
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 outline-none bg-white hover:border-gray-300"
            value={buyer.name ?? ""}
            onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
            disabled={disabled}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
