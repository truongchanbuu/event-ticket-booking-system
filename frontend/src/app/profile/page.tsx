"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Edit2,
  Save,
  X,
  Calendar,
  Phone,
  Mail,
  User,
  Activity,
  Clock,
  Plus,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";
import ProtectedRoute from "@/components/ProtectRoute";
import { Button } from "@/components/ui/button";
import {
  AccountStatusBadge,
  OrganizerStatusBadge,
  RoleBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import { useUser } from "@/hooks/use-user";
import ROLE from "@/schema/enums/role";
import { AppUser, UpdateUserData, UpdateUserSchema } from "@/schema/user";
import { Badge } from "@/components/ui/badge";
import { categories } from "@/constants/categories";
import LoadingPage from "@/components/app-loading";
import { InfoField } from "@/components/user/info-field";
import { ProfileSection } from "@/components/user/profile-section";
import { Input } from "@/components/ui/input";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import { getChangedFields } from "@/lib/helpers/object.helper";
import CategoryDialog from "@/components/ui/category-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const getRiskScoreColor = (score = 0.0) => {
  if (score <= 0.3) return "bg-green-500";
  if (score <= 0.7) return "bg-yellow-500";
  return "bg-red-500";
};

/* --------------------------------------------------
 * Main Page Component
 * -------------------------------------------------- */
const UserProfilePage: React.FC = () => {
  const { userProfile: userData, updateProfile } = useUser({
    needFetchProfile: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<AppUser | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const hasChanges = useMemo(() => {
    if (!isEditing || !userData || !editData) return false;
    return JSON.stringify(userData) !== JSON.stringify(editData);
  }, [userData, editData, isEditing]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateUserData>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      username: userData?.username || "",
      email: userData?.email || "",
      phoneNumber: userData?.phoneNumber || "",
      birthday: userData?.birthday || "",
    },
  });

  const handleEdit = useCallback(() => {
    reset({
      username: userData?.username,
      email: userData?.email,
      phoneNumber: userData?.phoneNumber,
      birthday: userData?.birthday,
    });
    setEditData(userData);
    setIsEditing(true);
  }, [userData]);

  const handleSave = useCallback(async () => {
    const changedFields = getChangedFields(userData, editData);
    if (Object.keys(changedFields).length > 0) {
      updateProfile(changedFields);
    }
    setIsEditing(false);
  }, [editData, userData, updateProfile]);

  const handleAvatarUpload = useCallback(
    async (newUrl: string) => {
      if (!userData) return;
      try {
        updateProfile({ photoUrl: newUrl });
      } catch (err) {
        console.error("Failed to update avatar:", err);
      }
    },
    [userData, updateProfile]
  );

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditData(null);
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  if (!userData) {
    return <LoadingPage message="Loading your profile..." />;
  }

  const currentData = isEditing ? editData : userData;

  const roleKey = currentData?.role;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <AvatarUploader
                onUpload={handleAvatarUpload}
                photoUrl={currentData?.photoUrl}
                username={currentData?.username}
              />
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div>
                    <Input
                      id="username"
                      className="text-3xl font-bold mb-2"
                      value={currentData.username}
                      {...register("username")}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                    />
                    {errors.username && (
                      <p className="text-red-500 text-sm">
                        {errors.username.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentData.username}
                  </h1>
                )}
                <div className="text-gray-600 mb-3 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {isEditing ? (
                    <div>
                      <Input
                        id="email"
                        type="email"
                        value={currentData.email}
                        {...register("email")}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span>{currentData.email}</span>
                  )}
                  <StatusBadge
                    type="status"
                    value={currentData.emailVerified ? "active" : "inactive"}
                    label={
                      currentData.emailVerified ? "Verified" : "Not Verified"
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {/* Role */}
                  <RoleBadge
                    value={roleKey}
                    label={currentData.role.toUpperCase()}
                  />
                  {/* Account status */}
                  <AccountStatusBadge value={currentData.status} />
                  {/* Organizer Status (conditional) */}
                  {currentData.role === ROLE.EVENT_ORGANIZER && (
                    <OrganizerStatusBadge value={currentData.organizerStatus} />
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={handleEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      variant="default"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="ghost">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Basic Information */}
              <ProfileSection title="Basic Information" icon={User}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <InfoField
                    label={
                      <>
                        <Phone className="w-4 h-4 inline mr-1" />
                        Phone Number
                      </>
                    }
                    isEditing={isEditing}
                    value={currentData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    type="tel"
                  >
                    <StatusBadge
                      type="status"
                      value={currentData.phoneVerified ? "active" : "inactive"}
                      label={
                        currentData.phoneVerified ? "Verified" : "Not Verified"
                      }
                    />
                  </InfoField>

                  {/* Birthday */}
                  <InfoField
                    label={
                      <>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Birthday
                      </>
                    }
                    isEditing={isEditing}
                    value={currentData.birthday}
                    onChange={(e) =>
                      handleInputChange("birthday", e.target.value)
                    }
                    type="date"
                  />
                </div>
              </ProfileSection>

              {/* Preferences */}
              <ProfileSection
                title="Preferences"
                icon={User}
                suffix={
                  <Button
                    className="bg-white text-black dark:bg-black dark:text-white dark:hover:bg-gray-800 transition-colors border"
                    onClick={openModal}
                  >
                    <Plus />
                  </Button>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {currentData?.preferenceCategories.length ? (
                    currentData?.preferenceCategories.map((catId) => {
                      const category = categories.find((c) => c.id === catId);
                      if (!category) return null;
                      return (
                        <Badge key={category.id} variant="outline">
                          <span className="mr-1">{category.icon}</span>
                          {category.name}
                        </Badge>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No preferences selected.
                    </p>
                  )}
                </div>
              </ProfileSection>

              {/* Activity & Security */}
              <ProfileSection title="Activity & Security" icon={Activity}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Risk Score
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getRiskScoreColor(
                            currentData.riskScore
                          )}`}
                          style={{
                            width: `${(currentData.riskScore ?? 0) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {(currentData.riskScore ?? 0) * 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </ProfileSection>
            </div>

            {/* Sidebar */}
            {currentData.createdAt && (
              <div className="lg:col-span-1">
                <ProfileSection title="Account Timeline" icon={Clock}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        Created
                      </h3>
                      <p className="text-gray-900">
                        {formatDateTime(currentData.createdAt)}
                      </p>
                    </div>
                    {currentData.updatedAt && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Last Updated
                        </h3>
                        <p className="text-gray-900">
                          {formatDateTime(currentData.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </ProfileSection>
              </div>
            )}
          </div>

          {/* Save Changes Alert */}
          {hasChanges && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up">
              <span>You have unsaved changes.</span>
              <Button
                onClick={handleSave}
                variant="outline"
                className="text-black"
              >
                Save Now
              </Button>
            </div>
          )}
        </div>

        <CategoryDialog
          tempSelectedCategories={currentData.preferenceCategories}
          closeModal={closeModal}
          isModalOpen={isModalOpen}
          onSave={(selections) => {
            updateProfile({ preferenceCategories: selections });
          }}
        />
      </div>
    </ProtectedRoute>
  );
};

export default UserProfilePage;
