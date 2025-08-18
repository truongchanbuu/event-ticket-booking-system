import { type ClassValue, clsx } from "clsx";
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge";
import { toUpperCaseFirstLetter } from "./helpers/string.helper";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (
  price: number,
  currency: string = "VND"
): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency,
  }).format(price);
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEventTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const dateStr = start.toLocaleDateString("en-US", dateOptions);
  const startTimeStr = start.toLocaleTimeString("en-US", timeOptions);
  const endTimeStr = end.toLocaleTimeString("en-US", timeOptions);

  return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
}

export function formatDate(
  date: Date | string | Timestamp | undefined
): string | undefined {
  if (date === undefined) return undefined;

  if (date instanceof Timestamp) {
    date = date.toDate();
  }

  let d: Date;

  if (typeof date === "string") {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(date);
    }
  } else if (date instanceof Date) {
    d = date;
  } else {
    return "Invalid date";
  }

  if (isNaN(d.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string | Timestamp): string {
  if (date instanceof Timestamp) {
    date = date.toDate();
  }

  const d = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateTime(
  input: Date | string | number | Timestamp | null | undefined
): string {
  if (input == null) return "";

  let dateObj: Date;
  if (typeof (input as any).toDate === "function") {
    dateObj = (input as any).toDate();
  } else if ((input as any)._seconds !== undefined) {
    const ts = input as any;
    dateObj = new Date(ts._seconds * 1000 + Math.floor(ts._nanoseconds / 1e6));
  } else {
    dateObj = new Date(input as string | number | Date);
  }

  if (isNaN(dateObj.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dateObj);
}

export function getDaysAgo(dateString: string): string {
  const inputDate = new Date(dateString);
  const now = new Date();

  if (isNaN(inputDate.getTime())) {
    return "Invalid Date";
  }

  inputDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (now.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "In the future";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return `${diffDays} day(s) ago`;
}

export function formatE164PhoneNumber(phone: string) {
  if (!phone.startsWith("+")) {
    return `+84${phone.replace(/^0/, "")}`;
  }
  return phone;
}

export function safeToDate(value: any): Date {
  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value);
}

// Chuyển ISO string → datetime-local format
export function toDatetimeLocalString(isoString?: string) {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  // Đảm bảo format local datetime string: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Chuyển datetime-local string → ISO string
export function toISOStringFromLocal(datetimeLocal: string) {
  const date = new Date(datetimeLocal);
  return date.toISOString(); // sẽ có Z, UTC timezone
}

export function generateQRCodeData(purchaseId: string, qrCode: string): string {
  return `TICKET:${purchaseId}:${qrCode}`;
}

export function getCategoryColor(categoryId: string) {
  const colors = {
    music: "category-music",
    sports: "category-sports",
    tech: "category-tech",
    food: "category-food",
    art: "category-art",
    business: "category-business",
  };
  return colors[categoryId as keyof typeof colors] || "gray-500";
}

export function getStatusColor(status: string) {
  const colors = {
    draft: "text-gray-200",
    published: "text-green-600",
    selling_fast: "text-orange-600",
    sold_out: "text-red-600",
    confirmed: "text-green-600",
    pending: "text-yellow-600",
    cancelled: "text-red-600",
  };
  return colors[status as keyof typeof colors] || "text-gray-600";
}

export function getBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return fromEnv ?? "http://localhost:4000";
}

/* ===================== Helpers an toàn ===================== */
export function toUpperFirstSafe(v: unknown) {
  const s = typeof v === "string" ? v : String(v ?? "Unknown");
  try {
    return toUpperCaseFirstLetter(s);
  } catch {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

export function toInt(n: unknown, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

export function safeFormatDate(x: any) {
  try {
    return formatDate(x);
  } catch {
    return "TBA";
  }
}

export function safeFormatTime(x: any) {
  try {
    return formatTime(x);
  } catch {
    return "";
  }
}

export function toEpochMs(t?: number | string) {
  if (t == null) return undefined;
  if (typeof t === "string") {
    const parsed = Date.parse(t);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  // number: có thể là giây (10 chữ số) hoặc ms (13 chữ số)
  // mốc 1e11 ~ năm 2004 (ms). <1e11 coi là giây.
  return t < 1e11 ? t * 1000 : t;
}

export function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const msToMMSS = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
};
