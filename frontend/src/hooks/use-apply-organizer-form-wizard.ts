import {
  ApplyOrganizerFormData,
  ApplyOrganizerFormSchema,
  ApplyOrganizerStep1Schema,
  createApplyOrganizerStep2Schema,
} from "@/schema";
import { useWizardForm } from "./use-wizard-form";

export function useApplyOrganizerWizard() {
  const defaultValues: ApplyOrganizerFormData = {
    // Step 1 defaults
    type: "personal",
    bio: "",
    websiteUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    xUrl: "",
    // Step 2 defaults
    identityCardFront: undefined,
    identityCardBack: undefined,
    businessLicense: undefined,
    eventLicense: undefined,
  };

  return useWizardForm<ApplyOrganizerFormData>({
    stepSchemas: [
      ApplyOrganizerStep1Schema,
      (getValues) => {
        const currentType = getValues().type;
        return createApplyOrganizerStep2Schema(currentType);
      },
    ],
    fullSchema: ApplyOrganizerFormSchema,
    defaultValues: defaultValues,
  });
}
