"use state";

import React, { useState } from "react";
import {
  Edit2,
  Save,
  X,
  Mail,
  UserPlus2,
  Settings,
  Users,
  Calendar,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import { Input } from "@/components/ui/input";
import {
  AccountStatusBadge,
  OrganizerStatusBadge,
  RoleBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import ROLE, { Role } from "@/schema/enums/role";
import { AppUser } from "@/schema/user";
import { useRouter } from "next/navigation";
import { ORGANIZER_STATUS } from "@/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { auth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { VerifyEmailDialog } from "../auth/verify-email";

interface ProfileHeaderProps {
  isEditing: boolean;
  isSubmitting: boolean;
  user: AppUser;
  errors: any;
  onEdit: () => void;
  onCancel: () => void;
  onAvatarUpload: (url: string) => Promise<void>;
  register: any;
  hasChanges: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditing,
  isSubmitting,
  user,
  errors,
  onEdit,
  onCancel,
  onAvatarUpload,
  register,
  hasChanges,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <AvatarUploader
          onUpload={onAvatarUpload}
          photoUrl={user.photoUrl}
          username={user.username}
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
            <RoleBadge
              value={user.role}
              label={(user.role ?? "guest").toUpperCase()}
            />
            <AccountStatusBadge value={user.status} />
            {user.role === ROLE.EVENT_ORGANIZER && (
              <OrganizerStatusBadge value={user.organizerStatus} />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <ProfileActionButtons
              onEdit={onEdit}
              userProfile={user}
              isLoading={!user}
            />
          ) : (
            <>
              <Button
                type="submit"
                disabled={
                  isSubmitting || !hasChanges || Object.keys(errors).length > 0
                }
                variant="default"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={onCancel} variant="ghost">
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

type Props = {
  onEdit: () => void;
  userProfile: {
    organizerStatus?: ORGANIZER_STATUS;
    role: Role;
  };
  isLoading?: boolean;
};

export const ProfileActionButtons: React.FC<Props> = ({
  onEdit,
  userProfile,
  isLoading,
}) => {
  const { toast } = useToast();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const router = useRouter();
  const organizerStatus = userProfile?.organizerStatus;
  const showApplyButton =
    organizerStatus === ORGANIZER_STATUS.NONE || !organizerStatus;
  const isOrganizerLoading = isLoading || (!organizerStatus && isLoading);

  const handleOrganizerClick = () => {
    const user = auth.currentUser;

    if (!user) {
      toast({ variant: "info", description: "You need login" });
      return;
    }

    if (!user.emailVerified) {
      setShowVerifyDialog(true); // mở dialog nếu chưa xác thực email
      return;
    }

    if (showApplyButton) {
      router.push("/organizers/apply");
    } else {
      router.push("/profile/application");
    }
  };

  const handleAdminNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onEdit}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>

        {userProfile.role !== ROLE.ADMIN && (
          <Button onClick={handleOrganizerClick} loading={isOrganizerLoading}>
            <UserPlus2 className="w-4 h-4 mr-2" />
            {isOrganizerLoading
              ? ""
              : showApplyButton
                ? "Become an Organizer"
                : "My Organizer Application"}
          </Button>
        )}

        <VerifyEmailDialog
          isOpen={showVerifyDialog}
          onClose={() => setShowVerifyDialog(false)}
          onVerified={() => {
            setShowVerifyDialog(false);
            handleOrganizerClick();
          }}
        />
      </div>

      {/* Admin Controls */}
      {userProfile.role === ROLE.ADMIN && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              Admin Controls
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => handleAdminNavigation("/admin/applications")}
              className="justify-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Applications
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => handleAdminNavigation("/admin/events")}
              className="justify-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => handleAdminNavigation("/admin/users")}
              className="justify-center"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
