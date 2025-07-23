// components/user/BasicInfoSection.tsx
"use client";

import { Phone, Calendar } from "lucide-react";
import { InfoField } from "./info-field";
import { ProfileSection } from "./profile-section";
import { StatusBadge } from "../ui/status-badge";
import { AppUser } from "@/schema/user";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { UpdateUserData } from "@/schema/user";

interface Props {
  user: AppUser;
  isEditing: boolean;
  register: UseFormRegister<UpdateUserData>;
  errors: FieldErrors<UpdateUserData>;
}

const BasicInfoSection: React.FC<Props> = ({
  user,
  isEditing,
  register,
  errors,
}) => {
  return (
    <ProfileSection title="Basic Information" icon={Phone}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <InfoField
            label={
              <>
                <Phone className="w-4 h-4 inline mr-1" /> Phone Number
              </>
            }
            isEditing={isEditing}
            value={user.phoneNumber}
            type="tel"
            registerProps={register("phoneNumber")}
          >
            <StatusBadge
              type="status"
              value={user.phoneVerified ? "active" : "inactive"}
              label={user.phoneVerified ? "Verified" : "Not Verified"}
            />
          </InfoField>
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div>
          <InfoField
            label={
              <>
                <Calendar className="w-4 h-4 inline mr-1" /> Birthday
              </>
            }
            isEditing={isEditing}
            value={user.birthday}
            type="date"
            registerProps={register("birthday")}
          />
          {errors.birthday && (
            <p className="text-red-500 text-sm">{errors.birthday.message}</p>
          )}
        </div>
      </div>
    </ProfileSection>
  );
};

export default BasicInfoSection;
