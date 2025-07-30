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
  documentName: string;
  documentType: string;
  fileUrl: string;
}
