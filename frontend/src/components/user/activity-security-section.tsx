// components/user/ActivitySecuritySection.tsx
"use client";

import { Activity } from "lucide-react";
import { ProfileSection } from "./profile-section";
import { AppUser } from "@/schema/user";

const getRiskScoreColor = (score = 0.0) => {
  if (score <= 0.3) return "bg-green-500";
  if (score <= 0.7) return "bg-yellow-500";
  return "bg-red-500";
};

interface Props {
  user: AppUser;
}

const ActivitySecuritySection: React.FC<Props> = ({ user }) => {
  return (
    <ProfileSection title="Activity & Security" icon={Activity}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Score</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getRiskScoreColor(user.riskScore)}`}
                style={{
                  width: `${(user.riskScore ?? 0) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {(user.riskScore ?? 0) * 100}%
            </span>
          </div>
        </div>
      </div>
    </ProfileSection>
  );
};

export default ActivitySecuritySection;
