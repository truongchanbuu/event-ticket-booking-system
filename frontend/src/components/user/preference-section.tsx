"use client";

import { useState } from "react";
import { Plus, User } from "lucide-react";
import { ProfileSection } from "./profile-section";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import CategoryDialog from "../ui/category-modal";
import { categories } from "@/constants/categories";
import { AppUser, UpdateUserData } from "@/schema/user";

interface Props {
  user: AppUser;
  isEditing: boolean;
  onPreferencesChange: (selections: string[]) => void;
  updateProfile: (data: Partial<UpdateUserData>) => void;
}

const PreferencesSection: React.FC<Props> = ({
  user,
  isEditing,
  onPreferencesChange,
  updateProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSavePreferences = async (selections: string[]) => {
    if (isEditing) {
      onPreferencesChange(selections);
    } else {
      await updateProfile({ preferenceCategories: selections });
    }
    closeModal();
  };

  return (
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
        {user?.preferenceCategories?.length ? (
          user.preferenceCategories.map((catId) => {
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
          <p className="text-gray-500 text-sm">No preferences selected.</p>
        )}
      </div>

      <CategoryDialog
        initialCategories={user.preferenceCategories ?? []}
        closeModal={closeModal}
        isModalOpen={isModalOpen}
        onSave={handleSavePreferences}
      />
    </ProfileSection>
  );
};

export default PreferencesSection;
