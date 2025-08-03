import { CloudinaryUploadResponse, SignUploadResponse } from "@/schema";
import { fetchAPI } from "../base";
import { RequestInit } from "next/dist/server/web/spec-extension/request";
import { string } from "zod";

async function fetchMedia<T>(path: string, options: RequestInit): Promise<T> {
  return fetchAPI<T>(`/public/media/${path}`, options);
}

export async function signUpload(
  docType?: string,
  folder?: string,
  id?: string
): Promise<SignUploadResponse> {
  return fetchMedia("/sign-upload", {
    method: "POST",
    body: JSON.stringify({ docType, folder, id }),
  });
}

// Image Upload API
export async function uploadCloudinary(
  cloudName: string,
  formData: FormData
): Promise<CloudinaryUploadResponse> {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${error}`);
  }

  return res.json();
}

export function deleteFromCloudinary(publicId: string) {
  return fetchMedia("/delete-cloudinary-image", {
    method: "PUT",
    body: JSON.stringify({ publicId }),
  });
}
