"use client";

import React from "react";
import { ApplyOrganizerForm } from "@/components/organizer/ApplyOrganizerForm";
import ProtectedRoute from "@/components/ProtectRoute";
import { uploadToCloudinary } from "@/services/cloudinary.service";
import { ApplyOrganizerFormData, ORGANIZER_STATUS } from "@/schema";
import { useToast } from "@/hooks/use-toast";
import { hasEventPermitData } from "@/lib/helpers/type-guard.helper";
import { applyOrganizer } from "@/lib/api";
import { useUser } from "@/hooks/use-user";

export default function ApplyOrganizerPage() {
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<ORGANIZER_STATUS>(
    userProfile.organizerStatus
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    // mockFetchStatus().then((res) => {
    //   setStatus(res.status);
    //   setReason(res.reason);
    // });
  }, []);

  const handleSubmit = async (data: ApplyOrganizerFormData) => {
    setSubmitting(true);

    try {
      const uploadPromises = [];
      const filesToUpload = [
        {
          key: "identityCardFrontUrl",
          fileValue: data.identityCardFront,
          docType: "id_card_front",
        },
        {
          key: "identityCardBackUrl",
          fileValue: data.identityCardBack,
          docType: "id_card_back",
        },
        {
          key: "businessLicenseUrl",
          fileValue: data.businessLicense,
          docType: "business_license",
        },
        {
          key: "eventLicenseUrl",
          fileValue: data.eventLicense,
          docType: "event_permit",
        },
      ];

      for (const { key, fileValue, docType } of filesToUpload) {
        if (fileValue?.file) {
          uploadPromises.push(
            uploadToCloudinary(fileValue.file, docType).then((url) => ({
              key,
              url,
            }))
          );
        }
      }

      const uploadedResults = await Promise.all(uploadPromises);

      const documentUrls = uploadedResults.reduce(
        (acc, { key, url }) => {
          acc[key] = url;
          return acc;
        },
        {} as { [key: string]: string }
      );

      const finalDataForBackend = {
        // --- Core Info ---
        applyType: data.type,

        // --- Application Data ---
        applicationData: {
          orgName: data.orgName,
          description: data.bio,
          website: data.website,
          facebook: data.facebook,
          instagram: data.instagram,
          x: data.x,
        },

        // --- KYC - Thông tin người đại diện (từ CCCD) ---
        representativeInfo: {
          fullName: data.fullName,
          idNumber: data.idNumber,
          dob: data.dateOfBirth,
          gender: data.gender,
          nationality: data.nationality,
          placeOfOrigin: data.placeOfOrigin,
          permanentAddress: data.permanentAddress,
          idIssueDate: data.dateOfIssue,
          idIssuedBy: data.placeOfIssue,
        },

        // --- Thông tin Doanh nghiệp ---
        ...(data.type === "business" && {
          businessInfo: {
            legalName: data.businessName,
            taxCode: data.taxCode ?? data.businessCode,
            businessCode: data.businessCode,
            address: data.address,
            legalRepresentative: data.legalRepresentative,
            typeOfBusiness: data.typeOfBusiness,
            registeredCapital: data.registeredCapital,
            businessSectors: data.businessSectors,
            dateOfIssue: data.dateOfIssue,
            placeOfIssue: data.placeOfIssue,
          },
        }),

        documentUrls: documentUrls,

        eventPermitInfo: {},
      };

      if (hasEventPermitData(data)) {
        finalDataForBackend.eventPermitInfo = {
          eventName: data.eventName,
          organizerName: data.organizerName,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          location: data.location,
          issueDate: data.issueDate,
          issuedBy: data.issuedBy,
          permitNumber: data.permitNumber,
          purpose: data.purpose,
          signedBy: data.signedBy,
        };
      }

      await applyOrganizer(finalDataForBackend);

      toast({
        variant: "success",
        title: "Save successfully",
        description:
          "Application submitted successfully! We will review it shortly.",
      });
      setStatus(ORGANIZER_STATUS.PENDING);
    } catch (error) {
      console.error("Submission process failed:", error);
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: `An error occurred during submission. Please try again. \nError: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-6xl mx-auto">
          {status === ORGANIZER_STATUS.NONE ? (
            <ApplyOrganizerForm onSubmit={handleSubmit} loading={submitting} />
          ) : (
            <p>Khoan chờ xíu</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
