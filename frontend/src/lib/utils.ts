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

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatTime(date: Date | string): string {
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
  if ((input as Timestamp).seconds !== undefined) {
    dateObj = (input as Timestamp).toDate();
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

export function safeToDate(value: any): Date {
  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate(); 
  }
  return new Date(value); 
}

export function generateQRCodeData(purchaseId: string, qrCode: string): string {
  return `TICKET:${purchaseId}:${qrCode}`;
}
