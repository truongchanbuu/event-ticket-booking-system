import { FileValue } from "@/schema/common";

export const getFileExtension = (fileName: string): string =>
  "." + (fileName.split(".").pop()?.toLowerCase() || "");

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export function isFileValue(value: any): value is FileValue {
  return (
    value &&
    typeof value === "object" &&
    value.file instanceof File &&
    typeof value.base64 === "string"
  );
}
