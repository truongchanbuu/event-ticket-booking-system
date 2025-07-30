import { z } from "zod";
import { allowedSectorRegex } from "../organizer";
import { urlOrDomainField } from "@/lib/helpers/schema-helper";

export const applicationSchema = z.object({
  applicationData: z.object({
    orgName: z.string().min(1, "Required"),
    description: z.string(),
    website: urlOrDomainField("website"),
    facebook: urlOrDomainField("facebook"),
    instagram: urlOrDomainField("instagram"),
    x: urlOrDomainField("x"),
  }),
  representativeInfo: z.object({
    fullName: z.string().min(1, "Full name is required."),

    idNumber: z
      .string()
      .min(9, "ID number must be at least 9 characters.")
      .max(12, "ID number must not exceed 12 characters."),

    dateOfBirth: z.string().min(1, "Date of birth is required."),
    gender: z.enum(["Male", "Female"]).optional().or(z.string().optional()),
    nationality: z.string().default("Vietnam").optional(),
    placeOfOrigin: z.string().optional(),
    permanentAddress: z.string().min(1, "Permanent address is required."),
    dateOfIssue: z.string().min(1, "Date of issue is required."),
    placeOfIssue: z.string().min(1, "Place of issue is required."),
  }),
  businessInfo: z.object({
    businessName: z.string().min(1, "Business name is required."),
    taxCode: z
      .string()
      .min(10, "Business code must be at least 10 characters."),
    dateOfIssue: z.string().min(1, "Date of issue is required."),
    placeOfIssue: z.string().min(1, "Place of issue is required."),
    legalRepresentative: z.string().optional(),
    address: z.string().min(1, "Business address is required."),
    typeOfBusiness: z.enum([
      "Doanh nghiệp tư nhân",
      "Công ty TNHH một thành viên",
      "Công ty TNHH hai thành viên trở lên",
      "Công ty cổ phần",
      "Công ty hợp danh",
    ]),
    registeredCapital: z.string().optional(),
    businessSectors: z
      .array(
        z
          .string()
          .min(2, "It should have at least 2 letters.")
          .max(50, "It should have equal or less than 50 letters.")
          .regex(
            allowedSectorRegex,
            "Only character, number and space are available."
          )
      )
      .optional(),
  }),
});
