import { deleteFromCloudinary, signUpload, uploadCloudinary } from "@/lib/api";

/**
 * Hàm upload file lên Cloudinary một cách an toàn bằng phương pháp Signed Upload.
 * @param file Đối tượng File cần upload.
 * @param docType Loại tài liệu (ví dụ: 'id_card_front', 'business_license') để BE ký đúng.
 * @returns Promise chứa URL an toàn của file đã upload.
 */
export async function uploadToCloudinary(
  file: File,
  docType?: string,
  prefix?: string,
  id?: string
): Promise<string> {
  const signData = await signUpload(docType, prefix, id);
  const { timestamp, signature, api_key, folder, cloud_name } = signData;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", `${timestamp}`);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadedData = await uploadCloudinary(cloud_name, formData);
  return uploadedData.secure_url;
}

export async function deleteImageFromCloudinary(url: string): Promise<boolean> {
  try {
    const result: any = await deleteFromCloudinary(url);
    console.log(JSON.stringify(result));
    if (!result || !result?.success) {
      return false;
    }

    return true;
  } catch (e) {
    console.error(`FAILED: ${e} `);
    return false;
  }
}
