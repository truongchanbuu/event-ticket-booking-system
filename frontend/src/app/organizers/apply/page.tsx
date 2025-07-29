"use client";

import React, { useCallback, useEffect } from "react";
import { ApplyOrganizerForm } from "@/components/organizer/ApplyOrganizerForm";
import ProtectedRoute from "@/components/ProtectRoute";
import { uploadToCloudinary } from "@/services/cloudinary.service";
import { ApplyOrganizerFormData, ORGANIZER_STATUS } from "@/schema";
import { useToast } from "@/hooks/use-toast";
import { hasEventPermitData } from "@/lib/helpers/type-guard.helper";
import {
  useOrganizerApply,
  useProfileManagement,
} from "@/hooks/user-store-hooks";
import { OrganizerStatus } from "@/components/organizer/OrganizerStatus";
import LoadingPage from "@/components/app-loading";
import { useRouter } from "next/navigation";

function _ApplyOrganizerPage() {
  const { userProfile } = useProfileManagement();
  const { isApplyingOrganizer, applyOrganizer } = useOrganizerApply();
  const [isUploading, setIsUploading] = React.useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (data: ApplyOrganizerFormData) => {
    setIsUploading(true);

    try {
      const documentUrls = await handleFileUploads(data);

      setIsUploading(false);
      const finalDataForBackend = prepareFinalData(data, documentUrls);

      await applyOrganizer(finalDataForBackend);
      router.push(`/profile/application`);
    } catch (error) {
      setIsUploading(false);
      console.error("File upload process failed:", error);
      toast({
        variant: "destructive",
        title: "Failed to upload files",
        description: `An error occurred during file upload. Please try again. \nError: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const handleViewDetail = useCallback(() => {
    router.push("/profile/application");
  }, [router]);

  if (!userProfile) {
    return (
      <LoadingPage
        message="Loading your organizer status"
        subMessage="Please wait"
      />
    );
  }

  const isLoading = isUploading || isApplyingOrganizer;
  const status = userProfile?.organizerStatus ?? ORGANIZER_STATUS.NONE;

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-6xl mx-auto">
        {status === ORGANIZER_STATUS.NONE ? (
          <ApplyOrganizerForm onSubmit={handleSubmit} loading={isLoading} />
        ) : (
          <OrganizerStatus status={status} onViewDetail={handleViewDetail} />
        )}
      </div>
    </div>
  );
}

export default function ApplyOrganizerPage() {
  return (
    <ProtectedRoute allowedRoles={["customer", "admin", "organizer"]}>
      <_ApplyOrganizerPage />
    </ProtectedRoute>
  );
}

// --- Helpers (Có thể đặt bên ngoài component function) ---

/**
 * Tải tất cả các file cần thiết lên Cloudinary.
 * @param data Dữ liệu từ form ApplyOrganizerFormData
 * @returns Promise chứa object các URL đã được tải lên.
 */
const handleFileUploads = async (
  data: ApplyOrganizerFormData
): Promise<{ [key: string]: string }> => {
  console.log("Starting file uploads...");
  const uploadPromises: Promise<{ key: string; url: string }>[] = [];
  const filesToUpload = [
    {
      key: "identityCardFront",
      fileValue: data.identityCardFront,
      docType: "id_card_front",
    },
    {
      key: "identityCardBack",
      fileValue: data.identityCardBack,
      docType: "id_card_back",
    },
    {
      key: "businessLicense",
      fileValue: data.businessLicense,
      docType: "business_license",
    },
    {
      key: "eventLicense",
      fileValue: data.eventLicense,
      docType: "event_permit",
    },
  ];

  for (const { key, fileValue, docType } of filesToUpload) {
    if (fileValue?.file) {
      console.log(`Preparing to upload: ${docType} (${key})`);
      uploadPromises.push(
        uploadToCloudinary(fileValue.file, docType)
          .then((url) => {
            console.log(`✅ SUCCESS uploading: ${docType}. URL: ${url}`);
            return { key, url };
          })
          .catch((err) => {
            console.error(
              `❌ FAILED uploading: ${docType} (${key}). Reason:`,
              err
            );
            throw err;
          })
      );
    }
  }

  // Promise.all sẽ vẫn thất bại như trước, nhưng giờ bạn đã biết chính xác file nào gây ra nó.
  return Promise.all(uploadPromises).then((uploadedResults) => {
    return uploadedResults.reduce(
      (acc, { key, url }) => {
        acc[key] = url;
        return acc;
      },
      {} as { [key: string]: string }
    );
  });
};

/**
 * Chuẩn bị dữ liệu cuối cùng để gửi lên backend.
 * @param data Dữ liệu gốc từ form
 * @param documentUrls Object chứa các URL từ Cloudinary
 * @returns Dữ liệu cuối cùng đã được định dạng.
 */
const prepareFinalData = (
  data: ApplyOrganizerFormData,
  documentUrls: { [key: string]: string }
) => {
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

  return finalDataForBackend;
};
