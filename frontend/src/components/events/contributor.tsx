import { Crown, Edit, Star, Trash2, User, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { EventContributor } from "@/schema";
import { EVENT_STATUS, EventStatus } from "@/schema/enums/event-status";
import { useEventContributor } from "@/hooks/use-event-contributor";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ConfirmDeleteModal } from "../ui/confirm-dialog";
import { ContributorModal } from "./contributor-modal";

interface ContributorCardProps {
  eventID: string;
  eventStatus: EventStatus;
  contributor: EventContributor;
  isHeadliner: boolean;
  className?: string;
}

export const ContributorCard = ({
  eventID,
  eventStatus,
  contributor,
  isHeadliner = false,
  className,
}: ContributorCardProps) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { removeContributor, isRemoving } = useEventContributor();
  const handleDelete = async () => {
    try {
      await removeContributor({
        eventID,
        contributorID: contributor.contributorID!,
      });

      toast({ variant: "success", title: "Deleted successfully!." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to delete." });
    }
  };

  return (
    <div
      className={cn(
        `relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
          isHeadliner
            ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white"
            : "border-gray-200"
        }`,
        className
      )}
    >
      {isHeadliner && (
        <div className="absolute -top-2 -right-2">
          <Crown className="w-5 h-5 text-yellow-500 bg-white rounded-full p-1 border border-yellow-200" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {contributor.photo ? (
            <img
              src={contributor.photoUrl}
              alt={contributor.fullname}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {contributor.fullname}
          </h4>
          <p className="text-sm text-gray-600 truncate">{contributor.role}</p>
          {isHeadliner && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              <Star className="w-3 h-3" />
              Headliner
            </span>
          )}
        </div>
      </div>

      {eventStatus !== EVENT_STATUS.PUBLISHED && (
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpdateModal(true)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCancelModal(true)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <ConfirmDeleteModal
          title="Delete Contributor"
          description="Do you want to delete this contributor?"
          onCancel={() => setShowCancelModal(false)}
          onConfirm={handleDelete}
          open={showCancelModal}
        />
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <ContributorModal
          eventID={eventID}
          isOpen={showUpdateModal}
          contributor={contributor}
          onClose={() => {
            setShowUpdateModal(false);
          }}
        />
      )}
    </div>
  );
};
