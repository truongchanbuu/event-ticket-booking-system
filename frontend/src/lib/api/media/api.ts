import { CloudinaryUploadResponse, SignUploadResponse } from "@/schema";
import { fetchAPI } from "../base";
import { RequestInit } from "next/dist/server/web/spec-extension/request";

const BASE_URL = process.env.NEXT_PUBLIC_MEDIA_SERVICE_URL!;

async function fetchMedia<T>(path: string, options: RequestInit): Promise<T> {
  return fetchAPI<T>(`${BASE_URL}${path}`, options);
}

export async function signUpload(docType: string): Promise<SignUploadResponse> {
  return fetchMedia("/api/media/sign-upload", {
    method: "POST",
    body: JSON.stringify({ docType }),
  });
}

// Image Upload API
export async function uploadCloudinary(
  cloudName: string,
  formData: FormData
): Promise<CloudinaryUploadResponse> {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  return fetchAPI(url, {
    method: "POST",
    body: formData,
    skipAuth: true,
  });
}
