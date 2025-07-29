"use client";

import React, { useState } from "react";
import {
  User,
  Building2,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Calendar,
  MapPin,
  FileText,
  Shield,
  Building,
  CreditCard,
  Clock,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Send,
} from "lucide-react";
import { APPLY_STATUS } from "@/schema";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/application/section-card";
import { InfoRow } from "@/components/application/info-row";
import { formatDate } from "@/lib/utils";
import { DocumentItem } from "@/components/application/document-item";

const MyApplicationUI = () => {
  // Sample data based on your structure
  const [applicationData] = useState({
    applyType: "business",
    applyStatus: APPLY_STATUS.PERMANENT_REJECTED,
    applicationData: {
      orgName: "Tech Innovation Hub",
      description:
        "Chúng tôi là một tổ chức chuyên tổ chức các sự kiện công nghệ, hội nghị khởi nghiệp và workshop về AI/ML.",
      website: "https://techinnovationhub.vn",
      facebook: "https://facebook.com/techinnovationhub",
      instagram: "https://instagram.com/techinnovationhub",
      x: "https://x.com/techinnovationhub",
    },
    representativeInfo: {
      fullName: "Nguyễn Văn Minh",
      idNumber: "001234567890",
      dob: "1985-03-15",
      gender: "Nam",
      nationality: "Việt Nam",
      placeOfOrigin: "Hà Nội",
      permanentAddress: "123 Đường Lê Lợi, Quận 1, TP.HCM",
      idIssueDate: "2020-01-15",
      idIssuedBy: "Công an TP.HCM",
    },
    businessInfo: {
      legalName: "Công ty TNHH Tech Innovation Hub",
      taxCode: "0123456789",
      businessCode: "BIZ123456",
      address: "456 Đường Nguyễn Trãi, Quận 5, TP.HCM",
      legalRepresentative: "Nguyễn Văn Minh",
      typeOfBusiness: "Dịch vụ tổ chức sự kiện",
      registeredCapital: "2,000,000,000 VND",
      businessSectors: ["Tổ chức sự kiện", "Công nghệ thông tin", "Đào tạo"],
      dateOfIssue: "2020-02-01",
      placeOfIssue: "Sở Kế hoạch và Đầu tư TP.HCM",
    },
    eventPermitInfo: {
      eventName: "Vietnam Tech Summit 2024",
      organizerName: "Tech Innovation Hub",
      eventDate: "2024-12-15",
      eventTime: "09:00 - 17:00",
      location: "Trung tâm Hội nghị Quốc tế, Quận 7, TP.HCM",
      issueDate: "2024-11-01",
      issuedBy: "UBND TP.HCM",
      permitNumber: "GP-2024-001234",
      purpose: "Tổ chức hội nghị công nghệ",
      signedBy: "Nguyễn Thị Lan - Phó Chủ tịch UBND",
    },
    documentUrls: [
      { name: "CCCD mặt trước", url: "/docs/cccd-front.jpg", type: "image" },
      { name: "CCCD mặt sau", url: "/docs/cccd-back.jpg", type: "image" },
      {
        name: "Giấy phép kinh doanh",
        url: "/docs/business-license.pdf",
        type: "pdf",
      },
      {
        name: "Giấy phép tổ chức sự kiện",
        url: "/docs/event-permit.pdf",
        type: "pdf",
      },
    ],
    submittedAt: "2024-11-15T10:30:00Z",
    applicationId: "APP-2024-001234",
  });

  const [expandedSections, setExpandedSections] = useState({
    application: true,
    representative: false,
    business: false,
    eventPermit: false,
    documents: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  const statusInfo = getStatusInfo(applicationData.applyStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
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
                {applicationData.applicationId}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Submitted At:{" "}
              {new Date(applicationData.submittedAt).toLocaleString("vi-VN")}
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
              Type: {getTypeLabel(applicationData.applyType)}
            </div>
          </div>
        </div>

        {/* Status Description */}
        <div
          className={`p-4 rounded-lg border-l-4 ${getStatusClass(applicationData.applyStatus)}`}
        >
          <p className="text-sm">{statusInfo.description}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Application Data */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <SectionCard
            title="Organizer Information"
            icon={Building2}
            isExpanded={expandedSections.application}
            onToggle={() => toggleSection("application")}
          >
            {expandedSections.application && (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <InfoRow
                    label="Organizer Name"
                    value={applicationData.applicationData.orgName}
                    icon={Building2}
                  />
                  <InfoRow
                    label="Activity Description"
                    value={applicationData.applicationData.description}
                    icon={FileText}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        label: "Website",
                        value: applicationData.applicationData.website,
                        icon: Globe,
                      },
                      {
                        label: "Facebook",
                        value: applicationData.applicationData.facebook,
                        icon: Facebook,
                      },
                      {
                        label: "Instagram",
                        value: applicationData.applicationData.instagram,
                        icon: Instagram,
                      },
                      {
                        label: "X (Twitter)",
                        value: applicationData.applicationData.x,
                        icon: Twitter,
                      },
                    ]
                      .filter((item) => item.value) // Ẩn nếu rỗng
                      .map((item, idx) => (
                        <InfoRow
                          key={idx}
                          label={item.label}
                          value={item.value}
                          icon={item.icon}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Representative Info */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <SectionCard
            title="Representative Information"
            icon={User}
            isExpanded={expandedSections.representative}
            onToggle={() => toggleSection("representative")}
          >
            {expandedSections.representative && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow
                    label="Full Name"
                    value={applicationData.representativeInfo.fullName}
                    icon={User}
                  />
                  <InfoRow
                    label="ID Card Number"
                    value={applicationData.representativeInfo.idNumber}
                    icon={CreditCard}
                  />
                  <InfoRow
                    label="Date of Birth"
                    value={new Date(
                      applicationData.representativeInfo.dob
                    ).toLocaleDateString("vi-VN")}
                    icon={Calendar}
                  />
                  <InfoRow
                    label="Gender"
                    value={applicationData.representativeInfo.gender}
                  />
                  <InfoRow
                    label="Nationality"
                    value={applicationData.representativeInfo.nationality}
                  />
                  <InfoRow
                    label="Place of Origin"
                    value={applicationData.representativeInfo.placeOfOrigin}
                    icon={MapPin}
                  />
                  <div className="md:col-span-2">
                    <InfoRow
                      label="Permant Address"
                      value={
                        applicationData.representativeInfo.permanentAddress
                      }
                      icon={MapPin}
                    />
                  </div>
                  <InfoRow
                    label="Date of Issuse"
                    value={new Date(
                      applicationData.representativeInfo.idIssueDate
                    ).toLocaleDateString("vi-VN")}
                    icon={Calendar}
                  />
                  <InfoRow
                    label="Place of Issuse"
                    value={applicationData.representativeInfo.idIssuedBy}
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Business Info (only if business type) */}
        {applicationData.applyType === "business" && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <SectionCard
              title="Business Information"
              icon={Building}
              isExpanded={expandedSections.business}
              onToggle={() => toggleSection("business")}
            >
              {expandedSections.business && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoRow
                      label="Legal Name"
                      value={applicationData.businessInfo.legalName}
                      icon={Building}
                    />
                    <InfoRow
                      label="Tax Code"
                      value={applicationData.businessInfo.taxCode}
                      icon={CreditCard}
                    />
                    <InfoRow
                      label="Legal Representative"
                      value={applicationData.businessInfo.legalRepresentative}
                      icon={UserCheck}
                    />
                    <div className="md:col-span-2">
                      <InfoRow
                        label="Address"
                        value={applicationData.businessInfo.address}
                        icon={MapPin}
                      />
                    </div>
                    <InfoRow
                      label="Type of Business"
                      value={applicationData.businessInfo.typeOfBusiness}
                    />
                    <InfoRow
                      label="Registered Capital"
                      value={applicationData.businessInfo.registeredCapital}
                    />
                    <InfoRow
                      label="Date of Issuse"
                      value={formatDate(
                        applicationData.businessInfo.dateOfIssue
                      )}
                      icon={Calendar}
                    />
                    <InfoRow
                      label="Place of Issuse"
                      value={applicationData.businessInfo.placeOfIssue}
                    />
                    <div className="md:col-span-2">
                      <div className="py-3">
                        <dt className="text-sm font-medium text-gray-500 mb-2">
                          Business Sectors
                        </dt>
                        <dd className="flex flex-wrap gap-2">
                          {applicationData.businessInfo.businessSectors.map(
                            (sector, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                {sector}
                              </span>
                            )
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* Event Permit Info */}
        {applicationData.eventPermitInfo &&
          Object.keys(applicationData.eventPermitInfo).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <SectionCard
                title="Event Licence"
                icon={Shield}
                onToggle={() => toggleSection("eventPermit")}
                isExpanded={expandedSections.eventPermit}
              >
                {expandedSections.eventPermit && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoRow
                        label="Event Name"
                        value={applicationData.eventPermitInfo.eventName}
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Organizer Name"
                        value={applicationData.eventPermitInfo.organizerName}
                        icon={Building2}
                      />
                      <InfoRow
                        label="Event Date"
                        value={formatDate(
                          applicationData.eventPermitInfo.eventDate
                        )}
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Time"
                        value={applicationData.eventPermitInfo.eventTime}
                        icon={Clock}
                      />
                      <div className="md:col-span-2">
                        <InfoRow
                          label="Location"
                          value={applicationData.eventPermitInfo.location}
                          icon={MapPin}
                        />
                      </div>
                      <InfoRow
                        label="Permit Number"
                        value={applicationData.eventPermitInfo.permitNumber}
                        icon={FileText}
                      />
                      <InfoRow
                        label="Date of Issuse"
                        value={formatDate(
                          applicationData.eventPermitInfo.issueDate
                        )}
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Issused By"
                        value={applicationData.eventPermitInfo.issuedBy}
                      />
                      <InfoRow
                        label="Signed By"
                        value={applicationData.eventPermitInfo.signedBy}
                        icon={UserCheck}
                      />
                      <div className="md:col-span-2">
                        <InfoRow
                          label="Purpose"
                          value={applicationData.eventPermitInfo.purpose}
                          icon={FileText}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          )}

        {/* Documents */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <SectionCard
            title="Uploaded Documents"
            icon={FileText}
            onToggle={() => toggleSection("documents")}
            isExpanded={expandedSections.documents}
            count={applicationData.documentUrls.length}
          >
            {expandedSections.documents && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applicationData.documentUrls.map((doc, index) => (
                    <DocumentItem key={index} doc={doc} />
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Need Support?{" "}
          <a href="/support" className="text-blue-600 hover:text-blue-800">
            Contact Us
          </a>
        </div>
        <div className="flex space-x-4">
          {applicationData.applyStatus === APPLY_STATUS.REJECTED && (
            <Button className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Send className="w-4 h-4" />
              <span>Re-apply Application</span>
            </Button>
          )}
          {(applicationData.applyStatus === APPLY_STATUS.NONE ||
            applicationData.applyStatus === APPLY_STATUS.PENDING ||
            applicationData.applyStatus === APPLY_STATUS.CANCELLED ||
            applicationData.applyStatus === APPLY_STATUS.PENDING_ADMIN) && (
            <Button
              variant="default"
              className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApplicationUI;
