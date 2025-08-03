import { type ClassValue, clsx } from "clsx";
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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
    // detect if format is dd/MM/yyyy
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      d = new Date(year, month - 1, day); // JS months are 0-indexed
    } else {
      d = new Date(date); // try default parsing
    }
  } else {
    d = date;
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
