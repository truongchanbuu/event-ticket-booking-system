"use client";

import React from "react";
import { APPLY_STATUS } from "@/schema/enums/apply-status";
import ApplyOrganizerForm from "@/components/organizer/ApplyOrganizerForm";
import ApplicationStatus from "@/components/organizer/ApplicationStatus";
import { Calendar, FileText, MapPin, User, Users } from "lucide-react";
import LoadingPage from "@/components/app-loading";
import { useUser } from "@/hooks/use-user";
import ProtectedRoute from "@/components/ProtectRoute";
import { ORGANIZER_STATUS } from "@/schema";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const mockFetchStatus = async (): Promise<{
  status: APPLY_STATUS | "none";
  reason?: string;
}> => {
  // TODO: Replace with real API call
  return { status: "none" };
};

const mockSubmit = async (
  data: any
): Promise<{ status: APPLY_STATUS; reason?: string }> => {
  // TODO: Replace with real API call
  await new Promise((r) => setTimeout(r, 1200));
  return { status: APPLY_STATUS.PENDING };
};

const ApplyOrganizerPage: React.FC = () => {
  const [status, setStatus] = React.useState<APPLY_STATUS | "none">("none");
  const [reason, setReason] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);

  const { userProfile, isProfileLoading } = useUser();

  React.useEffect(() => {
    mockFetchStatus().then((res) => {
      setStatus(res.status);
      setReason(res.reason);
    });
  }, []);

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    const res = await mockSubmit(data);
    setStatus(res.status);
    setReason(res.reason);
    setSubmitting(false);
  };

  const handleRetry = () => {
    setStatus("none");
    setReason(undefined);
  };

  if (isProfileLoading) {
    return <LoadingPage message="Please wait" />;
  }

  return (
    <ProtectedRoute>
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Name */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Organization Name *
              </Label>
              <Input
                type="text"
                value={formData.organizationName}
                onChange={(e) =>
                  handleInputChange("organizationName", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.organizationName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter organization name"
              />
              {errors.organizationName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.organizationName}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) =>
                  handleInputChange("contactPerson", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contactPerson ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter contact person name"
              />
              {errors.contactPerson && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.contactPerson}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Address
            </Label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter organization address"
            />
          </div>

          {/* Website */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Organization Description *
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows="4"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Describe your organization and its activities"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Experience */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Event Organization Experience
            </Label>
            <Textarea
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your experience in organizing events"
            />
          </div>

          {/* Event Types */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Event Types You Organize *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {eventTypeOptions.map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Input
                    type="checkbox"
                    checked={formData.eventTypes.includes(type)}
                    onChange={() => handleEventTypeChange(type)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
            {errors.eventTypes && (
              <p className="text-red-500 text-sm mt-1">{errors.eventTypes}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-md font-medium transition flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Application</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
};

export default ApplyOrganizerPage;
