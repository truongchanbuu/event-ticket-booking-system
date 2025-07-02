// components/ConfirmModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  actionText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "Action Confirm",
  message,
  actionText = "Confirm",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="z-[9999]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600">{message}</div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            className="hover:bg-primary hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button className="text-white" onClick={onConfirm}>
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
