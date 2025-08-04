import { ApplyStatus } from "../enums";
import { OrganizerType } from "../organizer";
import {
  BaseBusinessData,
  BaseEventPermitData,
  BaseRepresentativeData,
  DocumentBase,
} from "./base";

// IDCardDocument giờ kế thừa từ BaseRepresentativeData
export interface IDCardDocument extends DocumentBase, BaseRepresentativeData {
  documentType: "id_card";
  qrCodeData?: string;
  mrzCode?: string;
  photoUrls: {
    front: string;
    back: string;
  };
  signatureImageUrl?: string;
}

// BusinessLicenseDocument kế thừa từ BaseBusinessData
interface BusinessLicenseDocument extends DocumentBase, BaseBusinessData {
  documentType: "business_license";
  businessCode: string;
  address: string;
  dateOfIssue: string;
  placeOfIssue: string;
  qrCodeData?: string;
  scannedImageUrl?: string;
}

// EventPermitDocument kế thừa từ BaseEventPermitData
interface EventPermitDocument extends DocumentBase, BaseEventPermitData {
  documentType: "event_permit";
  qrCodeData?: string;
  scannedImageUrl?: string;
}

// Discriminated union cho tất cả các loại document
export type Document =
  | IDCardDocument
  | BusinessLicenseDocument
  | EventPermitDocument;

// ===================================================================
// 3. ĐỊNH NGHĨA INTERFACE APPLICATION CHÍNH
// ===================================================================
export interface ApplicationData {
  orgName: string;
  description?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
}

export interface ModerationInfo {
  rejectionReason?: string;
  requiresAdminApproval: boolean;
  rejectCount: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface Application {
  applicationID: string;
  userID: string;
  applyType: OrganizerType;
  status: ApplyStatus;
  submittedAt: string;
  submittedBy?: {
    email?: string;
    phoneNumber?: string;
    username?: string;
  };

  applicationData: ApplicationData;
  representativeInfo: BaseRepresentativeData;
  businessInfo?: BaseBusinessData;

  documents: DocumentBase[];
  moderation: ModerationInfo;
}

export interface ApplicationListReponse {
  success: boolean;
  data: Application[];
  meta: {
    count: number;
    hasMore: boolean;
    lastVisibleValue: string | null;
  };
}

export interface ApplicationReponse {
  success: boolean;
  data: Application;
  meta: {
    count: number;
    hasMore: boolean;
    lastVisibleValue: string | null;
  };
}
