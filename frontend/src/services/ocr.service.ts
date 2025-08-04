// src/services/ocr.ts

import { z } from "zod";
import {
  ExtractedIdCardSchema,
  ExtractedBusinessLicenseSchema,
  ExtractedEventPermitSchema,
} from "@/schema";

type OcrIdCardResponse = z.infer<typeof ExtractedIdCardSchema>;
type OcrBusinessLicenseResponse = z.infer<
  typeof ExtractedBusinessLicenseSchema
>;
type OcrEventPermitResponse = z.infer<typeof ExtractedEventPermitSchema>;

export type DocumentType = "idCard" | "businessLicense" | "eventPermit";

/**
 * Hàm giả lập gọi API OCR. Nó sẽ nhận một file và loại tài liệu,
 * sau đó trả về một object chứa các text đã được "trích xuất".
 * @param file Đối tượng File để xử lý (không được sử dụng trong bản mock này).
 * @param documentType Loại tài liệu để trả về dữ liệu giả lập tương ứng.
 * @returns Một Promise chứa dữ liệu đã được trích xuất.
 */
export async function runOCRApi(
  file: File,
  documentType: DocumentType
): Promise<
  OcrIdCardResponse | OcrBusinessLicenseResponse | OcrEventPermitResponse | {}
> {
  console.log(
    `[OCR MOCK] Processing file "${file.name}" as type "${documentType}"...`
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));

  switch (documentType) {
    case "idCard":
      console.log("[OCR MOCK] Returning mock data for Identity Card.");
      return {
        fullName: "NGUYỄN THỊ BÍCH PHƯỢNG",
        idNumber: "079195012345",
        dateOfBirth: "20/05/1995",
        gender: "Female",
        nationality: "Việt Nam",
        placeOfOrigin: "Xã An Bình, Huyện Long Hồ, Tỉnh Vĩnh Long",
        permanentAddress:
          "Số 188, đường Nguyễn Xí, Phường 26, Quận Bình Thạnh, Thành phố Hồ Chí Minh",
        dateOfIssue: "15/07/2021",
        placeOfIssue: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
        qrCodeData:
          "001079195012345|NGUYEN THI BICH PHUONG|20051995|Female|...",
        mrzCode: "IDVNM<079195012345<<<<<<<<<<<<<<<9505202F210715...",
        photoUrl: "https://placehold.co/200x250/EFEFEF/333?text=Portrait",
        signatureImageUrl:
          "https://placehold.co/300x100/EFEFEF/333?text=Signature",
      } as OcrIdCardResponse;

    case "businessLicense":
      console.log("[OCR MOCK] Returning mock data for Business License.");
      return {
        businessName:
          "CÔNG TY TNHH CÔNG NGHỆ VÀ TRUYỀN THÔNG SÁNG TẠO META HUB",
        businessCode: "0316123456",
        dateOfIssue: "10/01/2020",
        placeOfIssue: "Sở Kế hoạch và Đầu tư Thành phố Hồ Chí Minh",
        legalRepresentative: "TRẦN VĂN MINH",
        address:
          "Tầng 2, Tòa nhà Rosana, 60 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, Thành phố Hồ Chí Minh",
        typeOfBusiness: "Công ty trách nhiệm hữu hạn một thành viên",
        registeredCapital: "2,000,000,000 VNĐ",
        businessSectors: [
          "Tổ chức giới thiệu và xúc tiến thương mại",
          "Dịch vụ liên quan đến in",
          "Hoạt động nhiếp ảnh",
        ],
        taxCode: "0316123456",
        qrCodeData:
          "https://dichvuthongtin.dkkd.gov.vn/inf/default.aspx?id=0316123456",
        scannedImageUrl: "https://placehold.co/800x1100/EFEFEF/333?text=GPKD",
      } as OcrBusinessLicenseResponse;

    case "eventPermit":
      console.log("[OCR MOCK] Returning mock data for Event Permit.");
      return {
        eventName: "Đại nhạc hội Mùa Hè Sôi Động 2025",
        organizerName:
          "CÔNG TY TNHH CÔNG NGHỆ VÀ TRUYỀN THÔNG SÁNG TẠO META HUB",
        eventDate: "Thứ Bảy, ngày 25 tháng 10 năm 2025",
        eventTime: "Từ 18:00 đến 22:00",
        location:
          "Sân vận động Phú Thọ, 219 Lý Thường Kiệt, Phường 15, Quận 11, TP. HCM",
        issueDate: "01/08/2025",
        issuedBy: "Sở Văn hóa và Thể thao Thành phố Hồ Chí Minh",
        permitNumber: "123/GP-SVHTT",
        purpose: "Tổ chức biểu diễn nghệ thuật phục vụ công chúng",
        signedBy: "Phó Giám đốc - Nguyễn Hoàng Anh",
        qrCodeData: "verify.gov.vn/permit/123-GP-SVHTT",
        scannedImageUrl:
          "https://placehold.co/800x1100/EFEFEF/333?text=Giay+Phep",
      } as OcrEventPermitResponse;

    default:
      console.error(`[OCR MOCK] Unknown document type: ${documentType}`);
      return {};
  }
}
