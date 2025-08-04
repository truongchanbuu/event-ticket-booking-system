// components/user/TimelineSection.tsx
"use client";

import { Clock } from "lucide-react";
import { ProfileSection } from "./profile-section";
import { AppUser } from "@/schema/user";
import { formatDateTime } from "@/lib/utils";

interface Props {
  user: AppUser;
}

const TimelineSection: React.FC<Props> = ({ user }) => {
  if (!user.createdAt) return null;

  return (
    <div className="lg:col-span-1">
      <ProfileSection title="Account Timeline" icon={Clock}>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
            <p className="text-gray-900">{formatDateTime(user.createdAt)}</p>
          </div>
          {user.updatedAt && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Last Updated
              </h3>
              <p className="text-gray-900">{formatDateTime(user.updatedAt)}</p>
            </div>
          )}
        </div>
      </ProfileSection>
    </div>
  );
};

export default TimelineSection;
