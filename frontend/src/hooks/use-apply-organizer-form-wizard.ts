import {
  ApplyOrganizerFormData,
  ApplyOrganizerFormSchema,
  ApplyOrganizerStep1Schema,
  createApplyOrganizerStep2Schema,
  createApplyOrganizerStep3Schema,
} from "@/schema";
import { useWizardForm } from "./use-wizard-form";

export function useApplyOrganizerWizard() {
  const defaultValues: ApplyOrganizerFormData = {
    // === Step 1 Defaults ===
    type: "personal",
    orgName: "",
    bio: "",
    website: "",
    facebook: "",
    instagram: "",
    x: "",

    // === Step 2 Defaults ===
    identityCardFront: undefined,
    identityCardBack: undefined,
    businessLicense: undefined,
    eventLicense: undefined,

    // === Step 3 Defaults ===

    // -- Từ Schema CCCD --
    fullName: "",
    idNumber: "",
    dateOfBirth: "",
    permanentAddress: "",
    dateOfIssue: "", // Sẽ được giải quyết bằng tên duy nhất ở schema cuối
    placeOfIssue: "", // Sẽ được giải quyết bằng tên duy nhất ở schema cuối
    // Các trường optional
    gender: "",
    nationality: "Vietnam",
    placeOfOrigin: "",
    qrCodeData: "", // Sẽ có tên duy nhất
    mrzCode: "",
    photoUrl: "",
    signatureImageUrl: "",

    // -- Từ Schema Giấy phép kinh doanh --
    businessName: "",
    businessCode: "",
    address: "",
    legalRepresentative: "",
    typeOfBusiness: "",
    registeredCapital: "",
    businessSectors: [], // Default là mảng rỗng
    taxCode: "",
    // qrCodeData và scannedImageUrl đã được xử lý bằng tên duy nhất

    // -- Từ Schema Giấy phép sự kiện --
    eventName: "",
    organizerName: "",
    eventDate: "",
    eventTime: "",
    location: "",
    issuedBy: "",
    permitNumber: "",
    purpose: "",
    signedBy: "",
    scannedImageUrl: "",
  } as ApplyOrganizerFormData;

  return useWizardForm<ApplyOrganizerFormData>({
    stepSchemas: [
      // Bước 1: Thông tin cơ bản
      ApplyOrganizerStep1Schema,

      // Bước 2: Tải lên giấy tờ
      (getValues) => {
        const currentType = getValues().type;
        return createApplyOrganizerStep2Schema(currentType);
      },

      // Bước 3: Xác thực thông tin
      (getValues) => {
        const values = getValues();
        const currentType = values.type;
        const hasEventLicense = Boolean(values.eventLicense);

        return createApplyOrganizerStep3Schema(currentType, hasEventLicense);
      },
    ],
    fullSchema: ApplyOrganizerFormSchema,
    defaultValues: defaultValues,
  });
}
