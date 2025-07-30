"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Building2,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Calendar,
  FileText,
  Building,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Shield,
  MapPin,
  UserCheck,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/application/section-card";
import { DocumentItem } from "@/components/application/document-item";
import { useUserApplication } from "@/hooks/use-user-application";
import { useUserProfile } from "@/hooks/user-store-hooks";
import LoadingPage from "@/components/app-loading";
import { useRouter } from "next/navigation";
import { isEmptyObject } from "@/lib/helpers/object.helper";
import { EditableInfoRow } from "@/components/organizer/editable-info-row";
import { APPLY_STATUS } from "@/schema";
import {
  ApplicationFormValues,
  useApplicationEditForm,
} from "@/hooks/use-application-edit-form";
import { Controller } from "react-hook-form";

const MyApplicationUI = () => {
  const router = useRouter();
  const userProfile = useUserProfile();

  const {
    control,
    handleSubmit,
    reset,
    isDirty,
    isSubmitting,
    errors,
    isLoading,
    isFetched,
    application,
    canEdit,
  } = useApplicationEditForm(userProfile?.userID);

  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    application: true,
    representative: false,
    business: false,
    eventPermit: false,
    documents: true,
  });

  // useEffect(() => {
  //   if (!application && !isFetched) {
  //     router.push("/organizers/apply");
  //   }
  // }, [application, isFetched, router]);

  if (isLoading || !application) {
    return <LoadingPage />;
  }

  const onSubmit = async (values: ApplicationFormValues) => {
    console.log("Dữ liệu form sẽ được gửi đi:", values);
    // TODO: Gọi API để cập nhật đơn đăng ký
    // await updateApplicationMutation.mutateAsync({
    //   applicationID: application?.applicationID,
    //   data: values,
    // });

    // Tạm thời mô phỏng một lời gọi API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsEditing(false); // Thoát chế độ chỉnh sửa sau khi lưu thành công
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEditToggle = () => setIsEditing((prev) => !prev);

  const handleCancel = () => {
    reset(); // Reset form về trạng thái ban đầu
    setIsEditing(false);
  };

  const statusInfo = getStatusInfo(application.status);
  const StatusIcon = statusInfo.icon;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full mx-auto px-20 pb-10 bg-gray-50"
    >
      {/* Header */}
      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Application
            </h1>
            <p className="text-gray-600">
              Application Code:{" "}
              <span className="font-mono font-medium">
                {application.applicationID}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Submitted At:{" "}
              {new Date(application.submittedAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium border ${statusInfo.color} mb-2`}
            >
              <StatusIcon className="w-4 h-4" />
              <span>{statusInfo.text}</span>
            </div>
            <div className="text-xs text-gray-500">
              Type: {getTypeLabel(application.applyType)}
            </div>
          </div>
        </div>

        {/* Status Description */}
        <div
          className={`p-4 rounded-lg border-l-4 ${getStatusClass(application.status)}`}
        >
          <p className="text-sm">{statusInfo.description}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Application Data */}
        <SectionCard
          title="Organizer Information"
          icon={Building2}
          isExpanded={expandedSections.application}
          onToggle={() => toggleSection("application")}
          canEdit={canEdit}
          isEditing={isEditing}
          onEditToggle={handleEditToggle}
          onSave={handleSubmit(onSubmit)}
          onCancel={handleCancel}
          hasUnsavedChanges={isDirty}
          isLoading={isSubmitting}
        >
          {expandedSections.application && (
            <div className="grid grid-cols-1 gap-6">
              <Controller
                name="applicationData.orgName"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Organizer Name"
                    icon={Building2}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.applicationData?.orgName && (
                <p className="text-red-500 text-sm">
                  {errors.applicationData.orgName.message}
                </p>
              )}

              <Controller
                name="applicationData.description"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Activity Description"
                    icon={FileText}
                    isEditing={isEditing}
                    type="textarea"
                    required
                    {...field}
                  />
                )}
              />
              {errors.applicationData?.description && (
                <p className="text-red-500 text-sm">
                  {errors.applicationData.description.message}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialFields.map((socialField) => (
                  <Controller
                    key={socialField.name}
                    name={socialField.name as any}
                    control={control}
                    render={({ field, fieldState: { error } }) => {
                      if (!isEditing && !field.value) {
                        return <></>;
                      }

                      return (
                        <div className="flex flex-col">
                          <EditableInfoRow
                            label={socialField.label}
                            icon={socialField.icon}
                            type={socialField.type as any}
                            isEditing={isEditing}
                            {...field} // <-- Quan trọng: Kết nối trạng thái (value, onChange, onBlur) vào component
                          />
                          {/* Hiển thị lỗi validation nếu có */}
                          {error && (
                            <p className="text-sm text-red-600 mt-1">
                              {error.message}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Representative Info */}
        <SectionCard
          title="Representative Information"
          icon={User}
          isExpanded={expandedSections.representative}
          onToggle={() => toggleSection("representative")}
          canEdit={canEdit}
          isEditing={isEditing}
          onEditToggle={handleEditToggle}
          onSave={handleSubmit(onSubmit)}
          onCancel={handleCancel}
          hasUnsavedChanges={isDirty}
          isLoading={isSubmitting}
        >
          {expandedSections.representative && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                name="representativeInfo.fullName"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Full Name"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.fullName && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.fullName.message}
                </p>
              )}

              <Controller
                name="representativeInfo.idNumber"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="ID Number"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.idNumber && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.idNumber.message}
                </p>
              )}

              <Controller
                name="representativeInfo.gender"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Gender"
                    icon={User}
                    isEditing={isEditing}
                    required
                    type="select"
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                      { label: "Other", value: "Other" },
                    ]}
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.gender && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.gender.message}
                </p>
              )}

              <Controller
                name="representativeInfo.nationality"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Nationality"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.nationality && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.nationality.message}
                </p>
              )}

              <Controller
                name="representativeInfo.permanentAddress"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Permanent Address"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.permanentAddress && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.permanentAddress.message}
                </p>
              )}

              <Controller
                name="representativeInfo.placeOfOrigin"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Place of Origin"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.placeOfOrigin && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.placeOfOrigin.message}
                </p>
              )}

              <Controller
                name="representativeInfo.dob"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Date of Birth"
                    icon={User}
                    type="date"
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.dob && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.dob.message}
                </p>
              )}

              <Controller
                name="representativeInfo.idIssueDate"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Date of Issue"
                    icon={User}
                    type="date"
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.idIssueDate && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.idIssueDate.message}
                </p>
              )}

              <Controller
                name="representativeInfo.idIssuedBy"
                control={control}
                render={({ field }) => (
                  <EditableInfoRow
                    label="Issued By"
                    icon={User}
                    isEditing={isEditing}
                    required
                    {...field}
                  />
                )}
              />
              {errors.representativeInfo?.idIssuedBy && (
                <p className="text-red-500 text-sm">
                  {errors.representativeInfo.idIssuedBy.message}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* Business Info (only if business type) */}
        {application.applyType === "business" &&
          !isEmptyObject(application.businessInfo) && (
            <SectionCard
              title="Business Information"
              icon={Building}
              isExpanded={expandedSections.business}
              onToggle={() => toggleSection("business")}
              canEdit={canEdit}
              isEditing={isEditing}
              onEditToggle={handleEditToggle}
              onSave={handleSubmit(onSubmit)}
              onCancel={handleCancel}
              hasUnsavedChanges={isDirty}
              isLoading={isSubmitting}
            >
              {expandedSections.business && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    name="businessInfo.legalName"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Legal Name"
                        icon={User}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.legalName && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.legalName.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.taxCode"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Tax Code"
                        icon={CreditCard}
                        isEditing={isEditing}
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.taxCode && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.taxCode.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.address"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Address"
                        icon={MapPin}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.address && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.address.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.dateOfIssue"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Date of Issue"
                        icon={Calendar}
                        isEditing={isEditing}
                        required
                        type="date"
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.dateOfIssue && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.dateOfIssue.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.placeOfIssue"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Place of Issue"
                        icon={MapPin}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.placeOfIssue && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.placeOfIssue.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.legalRepresentative"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Legal Representative"
                        icon={UserCheck}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.legalRepresentative && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.legalRepresentative.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.registeredCapital"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Registered Capital"
                        icon={CreditCard}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.registeredCapital && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.registeredCapital.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.typeOfBusiness"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Type of Business"
                        icon={Building2}
                        isEditing={isEditing}
                        required
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.typeOfBusiness && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.typeOfBusiness.message}
                    </p>
                  )}

                  <Controller
                    name="businessInfo.businessSectors"
                    control={control}
                    render={({ field }) => (
                      <EditableInfoRow
                        label="Business Sectors"
                        icon={Shield}
                        isEditing={isEditing}
                        required
                        type="tags"
                        {...field}
                      />
                    )}
                  />
                  {errors.businessInfo?.businessSectors && (
                    <p className="text-red-500 text-sm">
                      {errors.businessInfo.businessSectors.message as string}
                    </p>
                  )}
                </div>
              )}
            </SectionCard>
          )}

        {/* Documents - Read only */}
        <SectionCard
          title="Uploaded Documents"
          icon={FileText}
          onToggle={() => toggleSection("documents")}
          isExpanded={expandedSections.documents}
          count={application.documents.length}
        >
          {expandedSections.documents && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {application.documents.map((doc, index) => (
                <DocumentItem key={index} doc={doc} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Action Buttons */}
      <footer className="mt-8 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Need Support?{" "}
          <a href="/support" className="text-blue-600 hover:text-blue-800">
            Contact Us
          </a>
        </div>
      </footer>
    </form>
  );
};

export default MyApplicationUI;

const getStatusInfo = (status: APPLY_STATUS) => {
  switch (status) {
    case APPLY_STATUS.APPROVED:
      return {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        text: "Approved",
        description: "Your application has been approved!",
      };
    case APPLY_STATUS.REJECTED:
    case APPLY_STATUS.PERMANENT_REJECTED:
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
        text: "Rejected",
        description:
          "Your application was rejected. Please review the feedback and re-apply or contact the admin.",
      };
    case APPLY_STATUS.PENDING:
    case APPLY_STATUS.PENDING_ADMIN:
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertCircle,
        text: "Pending Review",
        description:
          "Your application is under review. Please wait for updates.",
      };
    case APPLY_STATUS.PROCESSING:
      return {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Clock,
        text: "Being Reviewed",
        description: "An admin is currently reviewing your application.",
      };
    case APPLY_STATUS.CANCELLED:
      return {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: AlertCircle,
        text: "Cancelled",
        description: "You have cancelled this application.",
      };
    case APPLY_STATUS.NONE:
    default:
      return {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: AlertCircle,
        text: "Not Submitted",
        description: "Your application has not been submitted.",
      };
  }
};

const getStatusClass = (status: APPLY_STATUS) => {
  switch (status) {
    case APPLY_STATUS.APPROVED:
      return "bg-green-50 border-green-400";
    case APPLY_STATUS.REJECTED:
    case APPLY_STATUS.PERMANENT_REJECTED:
      return "bg-red-50 border-red-400";
    case APPLY_STATUS.PENDING:
    case APPLY_STATUS.PENDING_ADMIN:
      return "bg-yellow-50 border-yellow-400";
    case APPLY_STATUS.PROCESSING:
      return "bg-blue-50 border-blue-400";
    case APPLY_STATUS.CANCELLED:
    case APPLY_STATUS.NONE:
    default:
      return "bg-gray-50 border-gray-400";
  }
};

const getTypeLabel = (type) => {
  return type === "business" ? "Business" : "Personal";
};

const socialFields = [
  {
    name: "applicationData.website", // Tên trường trong schema/form values
    label: "Website",
    icon: Globe,
    type: "url",
  },
  {
    name: "applicationData.facebook",
    label: "Facebook",
    icon: Facebook,
    type: "url",
  },
  {
    name: "applicationData.instagram",
    label: "Instagram",
    icon: Instagram,
    type: "url",
  },
  {
    name: "applicationData.x",
    label: "X (Twitter)",
    icon: Twitter,
    type: "url",
  },
];
