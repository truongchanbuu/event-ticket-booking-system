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
  website: urlOrDomainField("Website URL"),
  facebook: urlOrDomainField("Facebook URL"),
  instagram: urlOrDomainField("Instagram URL"),
  x: urlOrDomainField("X Url"),
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
            (file) => Boolean(file),
            "Business license is required."
          )
        : OptionalFileSchema,
    eventLicense: OptionalFileSchema,
  });
};

// === STEP 3: FACTORY FUNCTION CHO SCHEMA XÁC NHẬN ===
export const createApplyOrganizerStep3Schema = (
  organizationType: OrganizerType,
  hasEventLicense: boolean
) => {
  let schema = ExtractedIdCardSchema;
  if (organizationType === "business") {
    schema = schema.merge(ExtractedBusinessLicenseSchema);
  }
  if (hasEventLicense) {
    schema = schema.merge(ExtractedEventPermitSchema);
  }
  return schema;
};

// === SCHEMA TỔNG HỢP ĐỂ VALIDATE LẦN CUỐI ===
const PersonalApplicationSchema = ApplyOrganizerStep1Schema.merge(
  createApplyOrganizerStep2Schema("personal")
)
  .merge(ExtractedIdCardSchema) // Luôn yêu cầu thông tin CCCD
  .extend({ type: z.literal("personal") }); // Ghi đè type để discriminatedUnion hoạt động

// 2. Tạo schema cho trường hợp 'business'
const BusinessApplicationSchema = ApplyOrganizerStep1Schema.merge(
  createApplyOrganizerStep2Schema("business")
)
  .merge(ExtractedIdCardSchema) // Luôn yêu cầu thông tin CCCD
  .merge(ExtractedBusinessLicenseSchema) // Thêm các trường GPKD
  .extend({ type: z.literal("business") }); // Ghi đè type

// 3. Sử dụng discriminatedUnion với các schema đã được xây dựng hoàn chỉnh
export const ApplyOrganizerFormSchema = z
  .discriminatedUnion("type", [
    PersonalApplicationSchema,
    BusinessApplicationSchema,
  ])
  .superRefine((data, ctx) => {
    if (data.eventLicense) {
      const result = ExtractedEventPermitSchema.safeParse(data);
      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }
  });

export type ApplyOrganizerStep1Data = z.infer<typeof ApplyOrganizerStep1Schema>;

export type ApplyOrganizerStep2Data = z.infer<
  ReturnType<typeof createApplyOrganizerStep2Schema>
>;

export type ApplyOrganizerStep3Data = z.infer<
  ReturnType<typeof createApplyOrganizerStep3Schema>
>;

export type ApplyOrganizerFormData = z.infer<typeof ApplyOrganizerFormSchema>;

export type ApplicationWithEventPermit = ApplyOrganizerFormData &
  z.infer<typeof ExtractedEventPermitSchema>;
