"use client";

import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  User,
  FileText,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/application/section-card";
import { DocumentItem } from "@/components/application/document-item";

const EventOrganizerAdmin = () => {
  const [expandedSections, setExpandedSections] = useState({
    organization: true,
    representative: true,
    license: true,
    permit: true,
    documents: true,
    moderation: true,
  });

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionStatus, setActionStatus] = useState<
    "approved" | "rejected" | null
  >(null);

  // Sample application data
  const applicationData = {
    id: "APP-2025-001",
    submittedDate: "2025-07-20",
    status: "pending",
    organization: {
      name: "Sunrise Events Co.",
      type: "Limited Liability Company",
      address: "123 Business District, Ho Chi Minh City, Vietnam",
      phone: "+84 28 1234 5678",
      email: "contact@sunriseevents.vn",
      website: "https://sunriseevents.vn",
      description:
        "Professional event management company specializing in corporate conferences, cultural festivals, and entertainment events.",
    },
    representative: {
      name: "Nguyen Van Minh",
      position: "CEO & Founder",
      phone: "+84 90 123 4567",
      email: "minh.nguyen@sunriseevents.vn",
      idNumber: "012345678901",
      experience: "8 years in event management",
    },
    businessLicense: {
      number: "BL-2023-HCM-5678",
      issueDate: "2023-03-15",
      expiryDate: "2028-03-14",
      issuingAuthority:
        "Ho Chi Minh City Department of Planning and Investment",
      status: "valid",
    },
    eventPermit: {
      number: "EP-2025-HCM-1234",
      issueDate: "2025-01-10",
      expiryDate: "2026-01-09",
      eventTypes: ["Conferences", "Cultural Events", "Concerts", "Exhibitions"],
      maxCapacity: "5000 attendees",
      status: "valid",
    },
    documents: [
      {
        name: "Business Registration Certificate",
        url: "",
        type: "PDF",
        size: "2.3 MB",
        status: "verified",
      },
      {
        name: "Tax Registration Document",
        url: "",
        type: "PDF",
        size: "1.8 MB",
        status: "verified",
      },
      {
        name: "Insurance Certificate",
        url: "",
        type: "PDF",
        size: "1.2 MB",
        status: "verified",
      },
      {
        name: "Previous Event Portfolio",
        url: "",
        type: "PDF",
        size: "8.7 MB",
        status: "verified",
      },
      {
        name: "Financial Statement 2024",
        url: "",
        type: "PDF",
        size: "3.1 MB",
        status: "pending",
      },
    ],
    moderation: {
      riskLevel: "low",
      backgroundCheck: "passed",
      previousViolations: 0,
      creditScore: "excellent",
      reviewNotes:
        "Well-established company with strong track record in event management.",
    },
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-amber-100 text-amber-800 border-amber-200",
        icon: Clock,
      },
      verified: {
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        icon: CheckCircle,
      },
      valid: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
      },
      passed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      excellent: {
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Star,
      },
      low: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: Shield,
      },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: AlertTriangle,
    };
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Admin Header */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Application Overview */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Application #{applicationData.id}
                </h2>
                <p className="text-gray-600">
                  Submitted on {applicationData.submittedDate}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(applicationData.status)}
                <div className="text-sm text-gray-500">Pending Review</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Status Alert */}
        {actionStatus && (
          <Alert
            className={`${actionStatus === "approved" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <AlertDescription
              className={`${actionStatus === "approved" ? "text-green-800" : "text-red-800"}`}
            >
              Application has been {actionStatus}!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <SectionCard
                title="Organization Information"
                icon={Building2}
                isExpanded={expandedSections.organization}
                onToggle={() => toggleSection("organization")}
              >
                {expandedSections.organization && (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Company Name
                        </label>
                        <p className="text-gray-800 font-semibold">
                          {applicationData.organization.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Business Type
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.organization.type}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Address
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.organization.address}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Phone
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.organization.phone}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Email
                        </Label>
                        <p className="text-blue-600">
                          {applicationData.organization.email}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Website
                        </Label>
                        <p className="text-blue-600">
                          {applicationData.organization.website}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Description
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.organization.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Representative Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <SectionCard
                title="Representative Information"
                icon={User}
                isExpanded={expandedSections.representative}
                onToggle={() => toggleSection("representative")}
              >
                {expandedSections.representative && (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Full Name
                        </Label>
                        <p className="text-gray-800 font-semibold">
                          {applicationData.representative.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Position
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.representative.position}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Phone
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.representative.phone}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Email
                        </Label>
                        <p className="text-blue-600">
                          {applicationData.representative.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          ID Number
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.representative.idNumber}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Experience
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.representative.experience}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Business License */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <SectionCard
                title="Business License"
                icon={FileText}
                isExpanded={expandedSections.license}
                onToggle={() => toggleSection("license")}
                badge={getStatusBadge(applicationData.businessLicense.status)}
              >
                {expandedSections.license && (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          License Number
                        </Label>
                        <p className="text-gray-800 font-mono">
                          {applicationData.businessLicense.number}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Status
                        </Label>
                        <div>
                          {getStatusBadge(
                            applicationData.businessLicense.status
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Issue Date
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.businessLicense.issueDate}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Expiry Date
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.businessLicense.expiryDate}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Issuing Authority
                        </Label>
                        <p className="text-gray-800">
                          {applicationData.businessLicense.issuingAuthority}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Event Permit */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <SectionCard
                title="Event Permit"
                icon={Calendar}
                isExpanded={expandedSections.permit}
                onToggle={() => toggleSection("permit")}
                badge={getStatusBadge(applicationData.eventPermit.status)}
              >
                {expandedSections.permit && (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Permit Number
                        </Label>
                        <p className="text-gray-800 font-mono">
                          {applicationData.eventPermit.number}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Status
                        </label>
                        <div>
                          {getStatusBadge(applicationData.eventPermit.status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Issue Date
                        </label>
                        <p className="text-gray-800">
                          {applicationData.eventPermit.issueDate}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Expiry Date
                        </label>
                        <p className="text-gray-800">
                          {applicationData.eventPermit.expiryDate}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Max Capacity
                        </label>
                        <p className="text-gray-800">
                          {applicationData.eventPermit.maxCapacity}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Event Types
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {applicationData.eventPermit.eventTypes.map(
                            (type, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {type}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Documents */}
            <SectionCard
              title="Uploaded Documents"
              icon={FileText}
              count={applicationData.documents.length}
              isExpanded={expandedSections.documents}
              onToggle={() => toggleSection("documents")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applicationData.documents.map((doc, index) => (
                  <DocumentItem key={index} doc={doc} />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Moderation Status */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <SectionCard
                title="Moderation Status"
                icon={Shield}
                isExpanded={expandedSections.moderation}
                onToggle={() => toggleSection("moderation")}
              >
                {expandedSections.moderation && (
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Risk Level
                        </span>
                        {getStatusBadge(applicationData.moderation.riskLevel)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Background Check
                        </span>
                        {getStatusBadge(
                          applicationData.moderation.backgroundCheck
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Previous Violations
                        </span>
                        <span className="font-semibold text-green-600">
                          {applicationData.moderation.previousViolations}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Credit Score
                        </span>
                        {getStatusBadge(applicationData.moderation.creditScore)}
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-600">
                        Review Notes
                      </label>
                      <p className="text-sm text-gray-800 mt-1">
                        {applicationData.moderation.reviewNotes}
                      </p>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                Admin Actions
              </h3>

              {!showRejectForm ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleApprove}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle size={18} />
                    Approve Application
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <XCircle size={18} />
                    Reject Application
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
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
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      Confirm Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Star size={18} />
                Application Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Documents Verified:</span>
                  <span className="font-semibold">4/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Risk Assessment:</span>
                  <span className="font-semibold">Low Risk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Processing Time:</span>
                  <span className="font-semibold">7 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventOrganizerAdmin;
