"use client";

import {
  FieldErrors,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";
import { Edit2, Save, X, Mail } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AvatarUploader } from "../ui/avatar-uploader";
import {
  StatusBadge,
  RoleBadge,
  AccountStatusBadge,
  OrganizerStatusBadge,
} from "../ui/status-badge";
import ROLE from "@/schema/enums/role";
import { AppUser, UpdateUserData } from "@/schema/user";

interface Props {
  user: AppUser;
  isEditing: boolean;
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: (data: UpdateUserData) => void;
  register: UseFormRegister<UpdateUserData>;
  errors: FieldErrors<UpdateUserData>;
  handleSubmit: UseFormHandleSubmit<UpdateUserData>;
  handleAvatarUpload: (url: string) => Promise<void>;
}

const UserProfileHeader: React.FC<Props> = ({
  user,
  isEditing,
  handleEdit,
  handleCancel,
  handleSave,
  register,
  errors,
  handleSubmit,
  handleAvatarUpload,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <AvatarUploader
          onUpload={handleAvatarUpload}
          photoUrl={user?.photoUrl}
          username={user?.username}
        />
        <div className="flex-1 text-center md:text-left">
          {isEditing ? (
            <div>
              <Input
                id="username"
                className="text-3xl font-bold mb-2"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-red-500 text-sm">
                  {errors.username.message}
                </p>
              )}
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user.username}
            </h1>
          )}
          <div className="text-gray-600 mb-3 flex items-center justify-center md:justify-start gap-2">
            <Mail className="w-4 h-4" />
            {isEditing ? (
              <div>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
            ) : (
              <span>{user.email}</span>
            )}
            <StatusBadge
              type="status"
              value={user.emailVerified ? "active" : "inactive"}
              label={user.emailVerified ? "Verified" : "Not Verified"}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <RoleBadge value={user.role} label={user.role.toUpperCase()} />
            <AccountStatusBadge value={user.status} />
            {user.role === ROLE.EVENT_ORGANIZER && (
              <OrganizerStatusBadge value={user.organizerStatus} />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <Button type="button" onClick={handleEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button onClick={handleSubmit(handleSave)} variant="default">
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
  );
};

export default UserProfileHeader;
