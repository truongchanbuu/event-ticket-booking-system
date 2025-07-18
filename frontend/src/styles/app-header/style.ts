import { HeaderVariant } from "@/types/app-header/type";

export function headerCls(variant: HeaderVariant, sticky?: boolean) {
  const base =
    "border-b px-4 sm:px-6 lg:px-10 py-4 mb-5 transition-all duration-200 print:hidden";
  const stickyCls = sticky ? "sticky top-0 z-50 backdrop-blur-sm" : "";
  switch (variant) {
    case "dark":
      return `${base} ${stickyCls} bg-gray-900 border-gray-700 shadow-lg`;
    case "gradient":
      return `${base} ${stickyCls} bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-transparent shadow-xl`;
    default:
      return `${base} ${stickyCls} bg-white/95 border-gray-200 shadow-sm`;
  }
}

export function textCls(variant: HeaderVariant) {
  return variant === "default" ? "text-gray-900" : "text-white";
}

export function linkCls(variant: HeaderVariant, active?: boolean) {
  const base =
    "p-3 text-md font-medium transition-all duration-200 hover:scale-105";
  if (active) {
    switch (variant) {
      case "dark":
        return `${base} text-white font-semibold border-b-2 border-blue-400`;
      case "gradient":
        return `${base} text-white font-semibold border-b-2 border-yellow-300`;
      default:
        return `${base} text-blue-600 font-semibold border-b-2 border-blue-600`;
    }
  }
  switch (variant) {
    case "dark":
      return `${base} text-gray-300 hover:text-white hover:shadow-lg`;
    case "gradient":
      return `${base} text-white/90 hover:text-white hover:shadow-lg`;
    default:
      return `${base} text-gray-600 hover:text-blue-600 hover:shadow-md`;
  }
}

export function primaryBtnCls(variant: HeaderVariant) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105";
  switch (variant) {
    case "dark":
      return `${base} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg`;
    case "gradient":
      return `${base} bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:shadow-lg backdrop-blur-sm`;
    default:
      return `${base} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md`;
  }
}

export function secondaryBtnCls(variant: HeaderVariant) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 border";
  switch (variant) {
    case "dark":
      return `${base} border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500`;
    case "gradient":
      return `${base} border-white/30 text-white hover:bg-white/20 hover:shadow-lg backdrop-blur-sm`;
    default:
      return `${base} border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-md`;
  }
}

export function logoCls(variant: HeaderVariant) {
  const base =
    "text-xl sm:text-xl font-bold transition-all duration-300 hover:scale-105";
  switch (variant) {
    case "dark":
      return `${base} text-blue-400 hover:text-blue-300`;
    case "gradient":
      return `${base} text-white hover:text-yellow-200 drop-shadow-lg`;
    default:
      return `${base} text-blue-600 hover:text-blue-700`;
  }
}

export function dropdownCls(variant: HeaderVariant) {
  const base = "absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50";
  switch (variant) {
    case "dark":
      return `${base} bg-gray-800 border border-gray-700`;
    case "gradient":
      return `${base} bg-white/95 backdrop-blur-sm border border-white/20`;
    default:
      return `${base} bg-white border border-gray-200`;
  }
}

export function dropdownItemCls(variant: HeaderVariant) {
  const base = "block px-4 py-2 text-sm transition-colors duration-200 w-full";
  switch (variant) {
    case "dark":
      return `${base} text-gray-300 hover:bg-gray-700 hover:text-white text-left`;
    case "gradient":
      return `${base} text-gray-700 hover:bg-gray-100 text-left`;
    default:
      return `${base} text-gray-700 hover:bg-gray-100 text-left`;
  }
}
