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
  Shield,
  MapPin,
  UserCheck,
  FileX,
  Sparkles,
  ArrowRight,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { SectionCard } from "@/components/application/section-card";
import { DocumentItem } from "@/components/application/document-item";
import { useUserProfile } from "@/hooks/user-store-hooks";
import LoadingPage from "@/components/app-loading";
import { useRouter } from "next/navigation";
import { isEmptyObject } from "@/lib/helpers/object.helper";
import { EditableInfoRow } from "@/components/organizer/editable-info-row";
import { APPLY_STATUS, DocumentBase } from "@/schema";
import {
  ApplicationFormValues,
  useApplicationEditForm,
} from "@/hooks/use-application-edit-form";
import { Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary } from "@/services/cloudinary.service";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import NoApplicationUI from "@/components/application/no-application";

const MyApplicationUI = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    application: true,
    representative: false,
    business: false,
    eventPermit: false,
    documents: true,
  });
  const router = useRouter();
  const { toast } = useToast();
  const userProfile = useUserProfile();

  const {
    applicationID,
    currentApplication,
    control,
    handleSubmit,
    clearErrors,
    touchedFields,
    reset,
    isDirty,
    isSubmitting,
    errors,
    isLoading,
    isFetching,
    application,
    canEdit,
    updateData,
    updateDocumentUrl,
  } = useApplicationEditForm(userProfile!.userID);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!application) {
    return <NoApplicationUI />;
  }

  const onSubmit = async (values: ApplicationFormValues) => {
    clearErrors();
    await updateData.mutateAsync({ appId: applicationID, data: values });
    setIsEditing(false);
  };

  // TODO: Có thể chuyển DocumentBase[] sang object để dễ update hơn
  const handleFileUpload = async (file: File, doc: DocumentBase) => {
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file, doc.documentType);

      const currentDocs = currentApplication?.documents || [];

      const updatedDoc: DocumentBase = {
        ...doc,
        fileUrl: url,
        updatedAt: new Date().toISOString(),
      };

      const updatedDocuments = [
        ...currentDocs.filter((d) => d.documentType !== doc.documentType),
        updatedDoc,
      ];

      await updateDocumentUrl.mutateAsync({
        appId: applicationID,
        data: { documents: updatedDocuments },
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Failed to upload file. Please try again later.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // const handleFileDelete = async (doc: DocumentBase) => {};

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEditToggle = () => setIsEditing((prev) => !prev);

  const handleCancel = () => {
    clearErrors();
    reset();
    setIsEditing(false);
  };

  const statusInfo = getStatusInfo(application.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="relative">
      {isFetching && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg font-medium text-gray-800">
            Syncing data...
          </span>
        </div>
      )}

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
                Submitted At: {formatDate(application.submittedAt)}
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
                {touchedFields.applicationData?.orgName &&
                  errors.applicationData?.orgName && (
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
                {touchedFields.applicationData?.description &&
                  errors.applicationData?.description && (
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
                {touchedFields.representativeInfo?.fullName &&
                  errors.representativeInfo?.fullName && (
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
                {touchedFields.representativeInfo?.idNumber &&
                  errors.representativeInfo?.idNumber && (
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
                {touchedFields.representativeInfo?.gender &&
                  errors.representativeInfo?.gender && (
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
                {touchedFields.representativeInfo?.nationality &&
                  errors.representativeInfo?.nationality && (
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
                {touchedFields.representativeInfo?.permanentAddress &&
                  errors.representativeInfo?.permanentAddress && (
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
                {touchedFields.representativeInfo?.placeOfOrigin &&
                  errors.representativeInfo?.placeOfOrigin && (
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
                {touchedFields.representativeInfo?.dob &&
                  errors.representativeInfo?.dob && (
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
                {touchedFields.representativeInfo?.idIssueDate &&
                  errors.representativeInfo?.idIssueDate && (
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
                {touchedFields.representativeInfo?.idIssuedBy &&
                  errors.representativeInfo?.idIssuedBy && (
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
                    {touchedFields.businessInfo?.legalName &&
                      errors.businessInfo?.legalName && (
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
                    {touchedFields.businessInfo &&
                      errors.businessInfo?.taxCode && (
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
                    {touchedFields.businessInfo?.legalRepresentative &&
                      errors.businessInfo?.address && (
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
                    {touchedFields.businessInfo?.dateOfIssue &&
                      errors.businessInfo?.dateOfIssue && (
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
                    {touchedFields.businessInfo?.placeOfIssue &&
                      errors.businessInfo?.placeOfIssue && (
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
                    {touchedFields.businessInfo?.legalRepresentative &&
                      errors.businessInfo?.legalRepresentative && (
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
                    {touchedFields.businessInfo?.registeredCapital &&
                      errors.businessInfo?.registeredCapital && (
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
                    {touchedFields.businessInfo?.typeOfBusiness &&
                      errors.businessInfo?.typeOfBusiness && (
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
                    {touchedFields.businessInfo?.businessSectors &&
                      errors.businessInfo?.businessSectors && (
                        <p className="text-red-500 text-sm">
                          {
                            errors.businessInfo.businessSectors
                              .message as string
                          }
                        </p>
                      )}
                  </div>
                )}
              </SectionCard>
            )}

          {/* Documents */}
          <SectionCard
            title="Uploaded Documents"
            icon={FileText}
            onToggle={() => toggleSection("documents")}
            isExpanded={expandedSections.documents}
            count={application.documents.length}
            hasUnsavedChanges={isDirty}
            isLoading={isSubmitting}
          >
            {expandedSections.documents && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {application.documents.map(
                  (doc: DocumentBase, index: number) => (
                    <DocumentItem
                      isUploading={isUploading}
                      key={index}
                      doc={doc}
                      canEdit={isEditing}
                      // onDelete={handleFileDelete}
                      onUpdate={handleFileUpload}
                    />
                  )
                )}
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

          {canEdit && isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={handleCancel}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isDirty || !isEmptyObject(errors) || isSubmitting}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleEditToggle}
              className="bg-secondary font-bold text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
          )}
        </footer>
      </form>
    </div>
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

// TODO: Handle race race cocurrency (editing & processing)
