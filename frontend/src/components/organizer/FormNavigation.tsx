import React, { useState } from "react";
import { useFormContext } from "react-hook-form"; // <-- IMPORT HOOK NÀY
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ApplyOrganizerFormData } from "@/schema";
import { WizardReturn } from "@/hooks/use-wizard-form";

import { runOCRApi } from "@/services/ocr.service";

interface FormNavigationProps {
  wizard: WizardReturn<ApplyOrganizerFormData>;
  loading?: boolean;
  onSubmit: (data: ApplyOrganizerFormData) => void | Promise<void>;
}

export const FormNavigation: React.FC<FormNavigationProps> = ({
  wizard,
  loading,
  onSubmit,
}) => {
  const { currentStep, isLast, goNext, goPrev, submitAll } = wizard;

  const {
    trigger,
    formState: { isValid },
    getValues,
    setValue,
  } = useFormContext<ApplyOrganizerFormData>();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1) {
      const isStepValid = await trigger([
        "identityCardFront",
        "identityCardBack",
        "businessLicense",
        "eventLicense",
      ]);
      if (!isStepValid) return;

      setIsProcessing(true);
      try {
        const { identityCardFront, businessLicense, eventLicense } =
          getValues();
        let allExtractedData = {};

        if (identityCardFront?.file) {
          const data = await runOCRApi(identityCardFront.file, "idCard");
          allExtractedData = { ...allExtractedData, ...data };
        }
        if (businessLicense?.file) {
          const data = await runOCRApi(businessLicense.file, "businessLicense");
          allExtractedData = { ...allExtractedData, ...data };
        }
        if (eventLicense?.file) {
          const data = await runOCRApi(eventLicense.file, "eventPermit");
          allExtractedData = { ...allExtractedData, ...data };
        }

        console.log("All OCR data received:", allExtractedData);

        Object.entries(allExtractedData).forEach(([key, value]) => {
          const formKey = key as keyof ApplyOrganizerFormData;
          setValue(formKey, value, { shouldValidate: true });
        });
      } catch (e) {
        alert("OCR failed. Please fill the form manually in the next step.");
      } finally {
        setIsProcessing(false);
        goNext();
      }
    } else {
      goNext();
    }
  };

  return (
    <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
      <div className="flex justify-between items-center">
        {/* Nút Back (không thay đổi) */}
        {currentStep > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={isProcessing}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : (
          <div />
        )}

        {/* Nút Next / Submit */}
        {!isLast ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submitAll(onSubmit)}
            disabled={!isValid || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Submit Application"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
