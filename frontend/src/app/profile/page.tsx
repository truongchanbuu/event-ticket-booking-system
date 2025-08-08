"use client";

import React from "react";

import { useProfileForm } from "@/hooks/use-profile-form";

import ProtectedRoute from "@/components/ProtectRoute";
import LoadingPage from "@/components/app-loading";
import SaveChangesAlert from "@/components/user/save-changes-alert";
import { ProfileHeader } from "@/components/user/user-profile-header";
import { BasicInfoSection } from "@/components/user/basic-info-section";
import PreferencesSection from "@/components/user/preference-section";
import ActivitySecuritySection from "@/components/user/activity-security-section";
import TimelineSection from "@/components/user/timeline-section";
import { useProfileManagement } from "@/hooks/user-store-hooks";
import { PaymentMethodsSection } from "@/components/payment/payment-methods-management";

const _UserProfilePage: React.FC = () => {
  const { userProfile, updateProfile } = useProfileManagement();
  const manager = useProfileForm({ userProfile, updateProfile });

  if (!manager.currentData) {
    return <LoadingPage message="Loading your profile..." />;
  }

  const { currentData } = manager;

  return (
    <form
      onSubmit={manager.handleSubmit(manager.handleSave)}
      className="min-h-screen bg-gray-50 py-8 px-4"
    >
      <div className="max-w-7xl mx-auto">
        <ProfileHeader
          isEditing={manager.isEditing}
          isSubmitting={manager.isSubmitting}
          user={currentData}
          errors={manager.errors}
          onEdit={manager.handleEdit}
          onCancel={manager.handleCancel}
          onAvatarUpload={manager.handleAvatarUpload}
          register={manager.register}
          hasChanges={manager.hasChanges}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BasicInfoSection
              isEditing={manager.isEditing}
              user={currentData}
              register={manager.register}
              errors={manager.errors}
            />

            {/* Preferences Section */}
            <PreferencesSection
              isEditing={manager.isEditing}
              updateProfile={updateProfile}
              onPreferencesChange={manager.handlePreferencesChange}
              user={currentData}
            />

            <PaymentMethodsSection isEditing={manager.isEditing} />

            {/* Activity & Security Section */}
            <ActivitySecuritySection user={currentData} />
          </div>

          {/* Account Timeline Section */}
          {currentData.createdAt && <TimelineSection user={currentData} />}
        </div>

        <SaveChangesAlert
          isVisible={
            manager.hasChanges && Object.values(manager.errors).length <= 0
          }
        />
      </div>
    </form>
  );
};

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <_UserProfilePage />
    </ProtectedRoute>
  );
}
