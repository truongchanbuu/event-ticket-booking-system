import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface VerifyEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export function VerifyEmailDialog({
  isOpen,
  onClose,
  onVerified,
}: VerifyEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      await sendEmailVerification(user);
      setSent(true);
    } catch (error) {
      console.error("Gửi email xác thực thất bại:", error);
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Send email verification failed. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      await user.reload();
      if (user.emailVerified) {
        onVerified?.();
        onClose();
      } else {
        toast({
          variant: "success",
          title: "Success",
          description: "Email has not verified. Please check your mailbox.",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Cannot verify. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Verification</DialogTitle>
          <DialogDescription>
            You need verify email before applying for organizer sự kiện.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {!sent ? (
            <Button onClick={handleSendEmail} disabled={loading}>
              {loading ? "Sending..." : "Send email verification"}
            </Button>
          ) : (
            <Button onClick={handleReload} disabled={loading}>
              {loading ? "Checking..." : "I verified, check again."}
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
