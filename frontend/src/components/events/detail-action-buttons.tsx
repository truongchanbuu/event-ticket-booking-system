import { Download, Edit, Eye, EyeOff, Plus, Trash2, Bell } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { EventStatus } from "@/schema/enums/event-status";
import { useState } from "react";

interface DetailActionButtonsProps {
  status: EventStatus;
  canPublished?: boolean;
}

export default function DetailActionButtons({
  status,
  canPublished = true,
}: DetailActionButtonsProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const handleCancelEvent = () => {
    // TODO: Gọi API cancel event tại đây
    setIsCancelModalOpen(false);
  };

  const canUpdate = status !== EventStatus.PUBLISHED;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!canUpdate}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Update Event</span>
          </Button>

          {status === EventStatus.DRAFT && (
            <Button
              disabled={!canPublished}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Publish Event</span>
            </Button>
          )}

          {status === EventStatus.PUBLISHED && (
            <Button className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
              <EyeOff className="h-4 w-4" />
              <span>Unpublish Event</span>
            </Button>
          )}

          <Button
            onClick={() => setIsCancelModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Cancel Event</span>
          </Button>

          <Button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Attendees</span>
          </Button>

          <Button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Bell className="h-4 w-4" />
            <span>Send Notification</span>
          </Button>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you sure you want to cancel this event?
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All ticket sales will be paused or
              refunded based on your event policy.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
            >
              No, keep event
            </Button>
            <Button variant="destructive" onClick={handleCancelEvent}>
              Yes, cancel event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
