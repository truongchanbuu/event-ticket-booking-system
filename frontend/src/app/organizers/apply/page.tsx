"use client";

import React, { useCallback, useEffect } from "react";
import { ApplyOrganizerForm } from "@/components/organizer/ApplyOrganizerForm";
import ProtectedRoute from "@/components/ProtectRoute";
import { uploadToCloudinary } from "@/services/cloudinary.service";
import {
  ApplyOrganizerFormData,
  DocumentBase,
  ORGANIZER_STATUS,
} from "@/schema";
import { useToast } from "@/hooks/use-toast";
import { hasEventPermitData } from "@/lib/helpers/type-guard.helper";
import {
  useOrganizerApply,
  useProfileManagement,
} from "@/hooks/user-store-hooks";
import { OrganizerStatus } from "@/components/organizer/OrganizerStatus";
import LoadingPage from "@/components/app-loading";
import { useRouter } from "next/navigation";
import ROLE from "@/schema/enums/role";

function _ApplyOrganizerPage() {
  const { userProfile } = useProfileManagement();
  const { isApplyingOrganizer, applyOrganizer } = useOrganizerApply();
  const [isUploading, setIsUploading] = React.useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (data: ApplyOrganizerFormData) => {
    setIsUploading(true);

    try {
      const documents = await handleFileUploads(data);

      setIsUploading(false);
      const finalDataForBackend = prepareFinalData(
        data,
        {
          email: userProfile?.email,
          phoneNumber: userProfile?.phoneNumber,
          username: userProfile?.username,
        },
        documents
      );

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
    <ProtectedRoute
      allowedRoles={[ROLE.CUSTOMER, ROLE.ADMIN, ROLE.EVENT_ORGANIZER]}
    >
      <_ApplyOrganizerPage />
    </ProtectedRoute>
  );
}

/**
 * Tải tất cả các file cần thiết lên Cloudinary.
 * @param data Dữ liệu từ form ApplyOrganizerFormData
 * @returns Promise chứa mảng DocumentBase đã được tải lên.
 */
const handleFileUploads = async (
  data: ApplyOrganizerFormData
): Promise<DocumentBase[]> => {
  console.log("Starting file uploads...");

  const uploadPromises: Promise<DocumentBase>[] = [];

  const filesToUpload = [
    {
      documentName: "identityCardFront",
      fileValue: data.identityCardFront,
      documentType: "id_card_front",
    },
    {
      documentName: "identityCardBack",
      fileValue: data.identityCardBack,
      documentType: "id_card_back",
    },
    {
      documentName: "businessLicense",
      fileValue: data.businessLicense,
      documentType: "business_license",
    },
    // {
    //   documentName: "eventLicense",
    //   fileValue: data.eventLicense,
    //   documentType: "event_permit",
    // },
  ];

  for (const { documentName, fileValue, documentType } of filesToUpload) {
    if (fileValue?.file) {
      console.log(`Preparing to upload: ${documentType} (${documentName})`);
      uploadPromises.push(
        uploadToCloudinary(fileValue.file, documentType)
          .then((url) => {
            console.log(`✅ SUCCESS uploading: ${documentType}. URL: ${url}`);
            return {
              documentName,
              documentType,
              fileUrl: url,
            };
          })
          .catch((err) => {
            console.error(
              `❌ FAILED uploading: ${documentType} (${documentName}). Reason:`,
              err
            );
            throw err;
          })
      );
    }
  }

  return Promise.all(uploadPromises);
};

/**
 * Chuẩn bị dữ liệu cuối cùng để gửi lên backend.
 * @param data Dữ liệu gốc từ form
 * @param documentUrls Object chứa các URL từ Cloudinary
 * @returns Dữ liệu cuối cùng đã được định dạng.
 */
const prepareFinalData = (
  data: ApplyOrganizerFormData,
  metadata: { email?: string; phoneNumber?: string; username?: string },
  documents: DocumentBase[]
) => {
  const finalDataForBackend = {
    // --- Core Info ---
    applyType: data.type,
    submittedBy: metadata,

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

    documents: documents,

    // eventPermitInfo: {},
  };

  // if (hasEventPermitData(data)) {
  //   finalDataForBackend.eventPermitInfo = {
  //     eventName: data.eventName,
  //     organizerName: data.organizerName,
  //     eventDate: data.eventDate,
  //     eventTime: data.eventTime,
  //     location: data.location,
  //     issueDate: data.issueDate,
  //     issuedBy: data.issuedBy,
  //     permitNumber: data.permitNumber,
  //     purpose: data.purpose,
  //     signedBy: data.signedBy,
  //   };
  // }

  return finalDataForBackend;
};
