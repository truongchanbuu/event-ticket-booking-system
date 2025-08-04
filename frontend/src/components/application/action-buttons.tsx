import { APPLY_STATUS } from "@/schema";
import { Button } from "../ui/button";
import { Edit3, Mail, Send } from "lucide-react";

type ActionButtonsProps = {
  status: APPLY_STATUS;
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({ status }) => {
  const canEdit = [
    APPLY_STATUS.NONE,
    APPLY_STATUS.PENDING,
    APPLY_STATUS.PENDING_ADMIN,
  ].includes(status);
  const canReapply =
    status === APPLY_STATUS.REJECTED || status === APPLY_STATUS.CANCELLED;
  const needContactAdmin = status === APPLY_STATUS.PERMANENT_REJECTED;

  return (
    <div className="mt-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6 border-t pt-6">
      <div className="text-sm text-muted-foreground">
        Need help?{" "}
        <a href="/support" className="text-primary hover:underline font-medium">
          Contact support
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        {needContactAdmin && (
          <Button className="bg-primary text-white hover:bg-primary">
            <Mail className="w-4 h-4 mr-2" /> Contact Admin
          </Button>
        )}

        {canReapply && (
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" /> Re-apply
          </Button>
        )}

        {canEdit && (
          <Button variant="outline">
            <Edit3 className="w-4 h-4 mr-2" /> Edit
          </Button>
        )}
      </div>
    </div>
  );
};
