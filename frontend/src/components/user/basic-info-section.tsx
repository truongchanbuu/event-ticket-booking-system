import React from "react";
import { Phone, Calendar, User } from "lucide-react";
import { ProfileSection } from "@/components/user/profile-section";
import { InfoField } from "@/components/user/info-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppUser } from "@/schema/user";

interface BasicInfoSectionProps {
  isEditing: boolean;
  user: AppUser;
  errors: any;
  register: any;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  isEditing,
  user,
  errors,
  register,
}) => {
  return (
    <ProfileSection title="Basic Information" icon={User}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <InfoField
            key="phoneNumber"
            label={
              <>
                <Phone className="w-4 h-4 inline mr-1" /> Phone Number
              </>
            }
            isEditing={isEditing}
            displayValue={user.phoneNumber}
            type="tel"
            {...register("phoneNumber")}
          >
            <StatusBadge
              type="status"
              value={user.phoneVerified ? "active" : "inactive"}
              label={user.phoneVerified ? "Verified" : "Not Verified"}
            />
          </InfoField>
          {errors?.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {errors.phoneNumber.message}
            </p>
          )}
        </div>

        <div>
          <InfoField
            key="birthday"
            label={
              <>
                <Calendar className="w-4 h-4 inline mr-1" /> Birthday
              </>
            }
            isEditing={isEditing}
            displayValue={user.birthday}
            type="date"
            {...register("birthday")}
          />
          {errors?.birthday && (
            <p className="text-red-500 text-sm mt-1">
              {errors.birthday.message}
            </p>
          )}
        </div>
      </div>
    </ProfileSection>
  );
};
