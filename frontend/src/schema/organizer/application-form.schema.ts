import { MAX_BIO_TEXT, MIN_BIO_TEXT } from "@/constants/application";
import { z } from "zod";
import { urlOrDomainField } from "@/lib/helpers/schema-helper";
import { OrganizerType } from "./organizer-type.schema";
import { FileSchema, OptionalFileSchema } from "../common";
import { OrganizerTypeSchema } from "../user";
import { ExtractedEventPermitSchema } from "./event-permit.schema";
import { ExtractedIdCardSchema } from "./id-card.schema";
import { ExtractedBusinessLicenseSchema } from "./business-licence.schema";

// === STEP 1: THÔNG TIN TỔ CHỨC ===
export const ApplyOrganizerStep1Schema = z.object({
  orgName: z.string().min(2, "You should give us your organizer name."),
  type: OrganizerTypeSchema,
  bio: z
    .string()
    .min(MIN_BIO_TEXT, `Bio must be at least ${MIN_BIO_TEXT} characters.`)
    .max(MAX_BIO_TEXT, `Bio must be under ${MAX_BIO_TEXT} characters.`),
  websiteUrl: urlOrDomainField("Website URL"),
  facebookUrl: urlOrDomainField("Facebook URL"),
  instagramUrl: urlOrDomainField("Instagram URL"),
  xUrl: urlOrDomainField("X Url"),
});

// === STEP 2: FACTORY FUNCTION CHO SCHEMA GIẤY TỜ ===
export const createApplyOrganizerStep2Schema = (
  organizationType: OrganizerType
) => {
  return z.object({
    identityCardFront: FileSchema,
    identityCardBack: FileSchema,
    businessLicense:
      organizationType === "business"
        ? FileSchema.refine(
            (file) => file?.file.name,
            "Business license is required."
          )
        : OptionalFileSchema,
    eventLicense: OptionalFileSchema,
  });
};

// === STEP 3: FACTORY FUNCTION CHO SCHEMA XÁC NHẬN ===
export const createApplyOrganizerStep3Schema = (
  organizationType: OrganizerType
) => {
  let schema = ExtractedIdCardSchema.merge(ExtractedEventPermitSchema);

  if (organizationType === "business") {
    schema = schema.merge(ExtractedBusinessLicenseSchema);
  }

  return schema;
};

// === SCHEMA TỔNG HỢP ĐỂ VALIDATE LẦN CUỐI ===
export const ApplyOrganizerFormSchema = z.discriminatedUnion("type", [
  // Trường hợp 1: type là 'personal'
  z.object({
    ...ApplyOrganizerStep1Schema.shape,
    ...createApplyOrganizerStep2Schema("personal").shape,
    ...createApplyOrganizerStep3Schema("personal").shape,
    type: z.literal("personal"),
  }),
  // Trường hợp 2: type là 'business'
  z.object({
    ...ApplyOrganizerStep1Schema.shape,
    ...createApplyOrganizerStep2Schema("business").shape,
    ...createApplyOrganizerStep3Schema("business").shape,
    type: z.literal("business"),
  }),
]);

export type ApplyOrganizerStep1Data = z.infer<typeof ApplyOrganizerStep1Schema>;

export type ApplyOrganizerStep2Data = z.infer<
  ReturnType<typeof createApplyOrganizerStep2Schema>
>;

export type ApplyOrganizerStep3Data = z.infer<
  ReturnType<typeof createApplyOrganizerStep3Schema>
>;

export type ApplyOrganizerFormData = z.infer<typeof ApplyOrganizerFormSchema>;
