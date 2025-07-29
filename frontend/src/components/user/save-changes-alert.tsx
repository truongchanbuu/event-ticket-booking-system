"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface SaveChangesAlertProps {
  isVisible: boolean;
}

const SaveChangesAlert: React.FC<SaveChangesAlertProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up">
      <span>You have unsaved changes.</span>
      <Button
        disabled={!isVisible}
        type="submit"
        variant="outline"
        className="text-black bg-white"
      >
        Save Now
      </Button>
    </div>
  );
};

export default SaveChangesAlert;
