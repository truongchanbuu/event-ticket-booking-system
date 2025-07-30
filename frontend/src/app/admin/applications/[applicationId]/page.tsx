"use client";

import React, { useState } from "react";
import {
  Building2,
  User,
  FileText,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Phone,
  Mail,
  MapPin,
  Hash,
  Lock,
} from "lucide-react";
import { SectionCard } from "@/components/application/section-card";
import { DocumentItem } from "@/components/application/document-item";
import { useApplicationDetail } from "@/hooks/user-application-detail";
import { useParams } from "next/navigation";
import LoadingPage from "@/components/app-loading";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { isEmptyObject } from "@/lib/helpers/object.helper";
import { Button } from "@/components/ui/button";
import { APPLY_STATUS } from "@/schema";

const EventOrganizerAdmin = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { data, isLoading } = useApplicationDetail(applicationId);
  const applicationData = data?.data;

  const [expandedSections, setExpandedSections] = useState({
    organization: true,
    representative: true,
    business: true,
    permit: true,
    documents: true,
    moderation: true,
  });

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [actionStatus, setActionStatus] = useState<
    "approved" | "rejected" | null
  >(null);

  if (isLoading || !applicationData) {
    return <LoadingPage />;
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleApprove = () => {
    setActionStatus("approved");
    setTimeout(() => setActionStatus(null), 3000);
  };
  const handleReject = () => {
    if (rejectionReason.trim()) {
      setActionStatus("rejected");
      setShowRejectForm(false);
      setRejectionReason("");
      setTimeout(() => setActionStatus(null), 3000);
    }
  };
  const handleLock = () => alert("Locked");
  const handleUnlock = () => alert("Unocked");

  const isBlocked = applicationData.status === APPLY_STATUS.LOCKED_BY_ADMIN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Application Overview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          {/* Main Title Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Application #{applicationData.applicationID}
                </h2>
                <div className="flex items-center text-gray-600 mt-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    Submitted on{" "}
                    {formatDate(applicationData.submittedAt) ?? "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Application Type Badge */}
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {applicationData.applyType.toUpperCase()}
            </div>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  User ID
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {applicationData.userID}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Username
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {applicationData.submittedBy?.username || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {applicationData.submittedBy?.email ||
                    applicationData.submittedBy?.username ||
                    "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {applicationData.submittedBy?.phoneNumber || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Status Alert */}
        {actionStatus && (
          <div
            className={`p-4 rounded-lg border ${actionStatus === "approved" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}
          >
            Application has been {actionStatus}!
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Information */}
            <SectionCard
              title="Organization Information"
              icon={Building2}
              isExpanded={expandedSections.organization}
              onToggle={() => toggleSection("organization")}
            >
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Organization Name
                    </Label>
                    <p className="text-gray-800 font-semibold">
                      {applicationData.applicationData.orgName}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Description
                  </Label>
                  <p className="text-gray-800">
                    {applicationData.applicationData.description}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {applicationData.applicationData.website && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Website
                      </Label>
                      <a
                        href={applicationData.applicationData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Globe size={14} />
                        {applicationData.applicationData.website}
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  {applicationData.applicationData.facebook && (
                    <a
                      href={applicationData.applicationData.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Facebook size={14} />
                      Facebook
                    </a>
                  )}
                  {applicationData.applicationData.instagram && (
                    <a
                      href={applicationData.applicationData.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline flex items-center gap-1"
                    >
                      <Instagram size={14} />
                      Instagram
                    </a>
                  )}
                  {applicationData.applicationData.x && (
                    <a
                      href={applicationData.applicationData.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 hover:underline flex items-center gap-1"
                    >
                      <Twitter size={14} />X (Twitter)
                    </a>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Representative Information */}
            <SectionCard
              title="Representative Information"
              icon={User}
              isExpanded={expandedSections.representative}
              onToggle={() => toggleSection("representative")}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Full Name
                  </Label>
                  <p className="text-gray-800 font-semibold">
                    {applicationData.representativeInfo.fullName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    ID Number
                  </Label>
                  <p className="text-gray-800 font-mono">
                    {applicationData.representativeInfo.idNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Date of Birth
                  </Label>
                  <p className="text-gray-800">
                    {formatDate(applicationData.representativeInfo.dob) ??
                      "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Place of Birth
                  </Label>
                  <p className="text-gray-800">
                    {applicationData.representativeInfo.placeOfOrigin}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Address
                  </Label>
                  <p className="text-gray-800 flex items-center gap-1">
                    <MapPin size={14} />
                    {applicationData.representativeInfo.permanentAddress}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Business Information */}
            {!isEmptyObject(applicationData.businessInfo) && (
              <SectionCard
                title="Business Information"
                icon={Building2}
                isExpanded={expandedSections.business}
                onToggle={() => toggleSection("business")}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Legal Name
                    </Label>
                    <p className="text-gray-800 font-semibold">
                      {applicationData.businessInfo?.legalName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Business Type
                    </Label>
                    <p className="text-gray-800">
                      {applicationData.businessInfo?.typeOfBusiness}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Tax Code
                    </Label>
                    <p className="text-gray-800 font-mono flex items-center gap-1">
                      <Hash size={14} />
                      {applicationData.businessInfo?.taxCode}
                    </p>
                  </div>
                  {applicationData.businessInfo?.dateOfIssue && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Issue Date
                      </Label>
                      <p className="text-gray-800">
                        {formatDate(
                          applicationData.businessInfo?.dateOfIssue
                        ) ?? "N/A"}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Business Address
                    </Label>
                    <p className="text-gray-800 flex items-center gap-1">
                      <MapPin size={14} />
                      {applicationData.businessInfo?.address}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Place of Issue
                    </Label>
                    <p className="text-gray-800">
                      {applicationData.businessInfo?.placeOfIssue}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Event Permit Information */}
            {!isEmptyObject(applicationData.eventPermitInfo) && (
              <SectionCard
                title="Event Permit Information"
                icon={Calendar}
                isExpanded={expandedSections.permit}
                onToggle={() => toggleSection("permit")}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Permit Number
                    </Label>
                    <p className="text-gray-800 font-mono">
                      {applicationData.eventPermitInfo?.permitNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Issue Date
                    </Label>
                    <p className="text-gray-800">
                      {formatDate(applicationData.eventPermitInfo?.issueDate) ??
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Issuse Date
                    </Label>
                    <p className="text-gray-800">
                      {formatDate(applicationData.eventPermitInfo?.issueDate) ??
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Issused By
                    </Label>
                    <p className="text-gray-800">
                      {applicationData.eventPermitInfo?.issuedBy} people
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">
                      Event Location
                    </Label>
                    <p className="text-gray-800 flex items-center gap-1">
                      <MapPin size={14} />
                      {applicationData.eventPermitInfo?.location}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Documents */}
            <SectionCard
              title="Uploaded Documents"
              icon={FileText}
              count={applicationData.documents?.length}
              isExpanded={expandedSections.documents}
              onToggle={() => toggleSection("documents")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applicationData.documents?.map((doc, index) => (
                  <DocumentItem
                    key={index}
                    doc={{
                      documentType: doc.documentType,
                      documentName: doc.documentName,
                      fileUrl: doc.fileUrl,
                    }}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Moderation Status */}
            <SectionCard
              title="Moderation Status"
              icon={Shield}
              isExpanded={expandedSections.moderation}
              onToggle={() => toggleSection("moderation")}
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Requires Admin Approval
                  </Label>
                  <p className="text-sm text-gray-800 mt-1">
                    {applicationData.moderation.requiresAdminApproval
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Rejection Count
                  </Label>
                  <p className="text-sm text-gray-800 mt-1">
                    {applicationData.moderation.rejectCount}
                  </p>
                </div>
                {applicationData.moderation.rejectionReason && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Last Rejection Reason
                    </Label>
                    <p className="text-sm text-gray-800 mt-1">
                      {applicationData.moderation.rejectionReason}
                    </p>
                  </div>
                )}
                {applicationData.moderation.reviewedBy && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Reviewed By
                    </Label>
                    <p className="text-sm text-gray-800 mt-1">
                      {applicationData.moderation.reviewedBy.toLocaleUpperCase()}
                    </p>
                  </div>
                )}
                {applicationData.moderation.reviewedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Reviewed At
                    </Label>
                    <p className="text-sm text-gray-800 mt-1">
                      {formatDate(applicationData.moderation.reviewedAt) ??
                        "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                Admin Actions
              </h3>

              {!showRejectForm && !showBanForm ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleApprove}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle size={18} />
                    Approve Application
                  </Button>

                  <Button
                    onClick={isBlocked ? handleUnlock : handleLock}
                    className={
                      isBlocked
                        ? "w-full bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-l"
                        : "w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                    }
                  >
                    <Lock size={18} />
                    {isBlocked ? "Unlock" : "Lock"}
                  </Button>

                  <Button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <XCircle size={18} />
                    Reject Application
                  </Button>
                  <Button
                    onClick={() => setShowBanForm(true)}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Shield size={18} />
                    Ban Permanently
                  </Button>
                </div>
              ) : showRejectForm ? (
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a detailed reason for rejection..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Confirm Reject
                    </Button>
                    <Button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Permanent Ban Reason{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="This action is irreversible. Clearly state the reason for the permanent ban..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (banReason.trim()) {
                          alert("User banned permanently");
                          setShowBanForm(false);
                          setBanReason("");
                        }
                      }}
                      disabled={!banReason.trim()}
                      className="flex-1 bg-red-800 hover:bg-red-900 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Confirm Ban
                    </Button>
                    <Button
                      onClick={() => setShowBanForm(false)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventOrganizerAdmin;
