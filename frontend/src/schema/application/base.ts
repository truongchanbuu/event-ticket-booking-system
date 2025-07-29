export interface BaseRepresentativeData {
  fullName: string;
  idNumber: string;
  dob: string;
  gender: "male" | "female" | "other" | string;
  nationality: string;
  placeOfOrigin: string;
  permanentAddress: string;
  idIssueDate: string;
  idIssuedBy: string;
}

export interface BaseBusinessData {
  legalName: string;
  taxCode?: string;
  businessCode?: string;
  address?: string;
  legalRepresentative?: string;
  typeOfBusiness?: string;
  registeredCapital?: string; // vì dữ liệu bạn truyền là "2,000,000,000 VNĐ"
  businessSectors?: string[];
  dateOfIssue?: string;
  placeOfIssue?: string;
}

export interface BaseEventPermitData {
  eventName: string;
  organizerName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  issueDate: string;
  issuedBy: string;
  permitNumber: string;
  purpose: string;
  signedBy: string;
}

export interface DocumentBase {
  documentType: string;
  fileUrl: string; // URL để xem/tải file gốc
}

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
