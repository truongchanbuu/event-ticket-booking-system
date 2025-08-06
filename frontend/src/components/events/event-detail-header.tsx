import { useEffect, useState } from "react";
import { createImagesFromUrls, ImageItem, ImageSlider } from "../image-slider";
import { deleteImageFromCloudinary } from "@/services/cloudinary.service";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  Star,
  User,
  Variable,
  XCircle,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { Event } from "@/schema";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";
import { UpdateEventFn } from "@/types/event.api";
import CategoryDialog from "../ui/category-modal";
import { EventManagementService } from "@/services/event-management.service";
import { useUserProfile } from "@/hooks/user-store-hooks";
import { toast } from "@/hooks/use-toast";

interface EventDetailHeaderProps {
  eventDetail: Event;
  images: string[];
  updateEvent: UpdateEventFn;
}

export default function EventDetailHeader({
  eventDetail,
  images: imgs,
  updateEvent,
}: EventDetailHeaderProps) {
  const userProfile = useUserProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const [originalImages, setOriginalImages] = useState<ImageItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    const transferredImages = createImagesFromUrls(imgs);
    setImages(transferredImages);
    setOriginalImages(transferredImages);
  }, [imgs]);

  const handleAddCategory = async (selected: string[]) => {
    try {
      await updateEvent({ categories: selected });
      setIsCategoriesModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async (newImages: ImageItem[]) => {
    if (!userProfile?.userID) {
      toast({ variant: "destructive", title: "No user found!" });
      return;
    }

    setIsUploading(true);

    try {
      const added = newImages.filter((img) => img.file);
      const kept = newImages.filter((img) => !img.file);
      const deleted = originalImages.filter(
        (orig) => !newImages.some((img) => img.src === orig.src)
      );

      const uploaded = await Promise.all(
        added.map(async (img) => {
          const url = await EventManagementService.uploadThumbnails({
            userID: userProfile!.userID,
            file: img.file,
          });

          return { ...img, src: url, file: undefined };
        })
      );

      await Promise.all(
        deleted.map(async (img) => {
          await deleteImageFromCloudinary(img.src);
        })
      );

      const final = [...kept, ...uploaded];
      const finalUrls: string[] = final.map((img) => img.src);

      console.log(`FINALS: ${finalUrls}`);
      await updateEvent({ images: finalUrls });

      setOriginalImages(final);
      setImages(final);
    } catch (e) {
      console.log(e);
    } finally {
      setIsUploading(false);
    }
  };

  return isUploading ? (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="animate-spin w-8 h-8" />
    </div>
  ) : (
    <div>
      <ImageSlider
        images={images}
        onImagesChange={(updated) => setImages(updated)}
        onSave={() => handleSave(images)}
      />

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <img
              src={eventDetail.organizer.photoUrl}
              alt={eventDetail.organizer.name}
              className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
            />
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {eventDetail.title}
                </h1>
                {eventDetail.isFeatured && (
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                )}
              </div>
              <p className="text-gray-600">by {eventDetail.organizer.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(eventDetail.status)}`}
            >
              {toUpperCaseFirstLetter(eventDetail.status)}
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4">{eventDetail.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(eventDetail.startTime)} -{" "}
              {formatDate(eventDetail.endTime)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{eventDetail.location.address}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mt-4 group relative">
          {eventDetail.categories.map((category) => (
            <span
              key={category}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {toUpperCaseFirstLetter(category)}
            </span>
          ))}

          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="ml-1 text-xs text-blue-500 px-1 py-1 rounded-full border border-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100"
            title="Add category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Cancellation Information */}
        {eventDetail.status?.toLowerCase() === "cancelled" && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-3">
                  Event Cancelled
                </h3>

                <div className="space-y-2 text-sm text-red-700">
                  {eventDetail.cancelledAt && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span>
                        <span className="font-medium">Cancelled on:</span>{" "}
                        {formatDate(eventDetail.cancelledAt)} at{" "}
                        {formatTime(eventDetail.cancelledAt)}
                      </span>
                    </div>
                  )}

                  {eventDetail?.cancelledByUsername && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-red-500" />
                      <span>
                        <span className="font-medium">Cancelled by:</span>{" "}
                        {toUpperCaseFirstLetter(
                          eventDetail.cancelledByUsername
                        )}
                      </span>
                    </div>
                  )}

                  {eventDetail.cancelledReason && (
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <span className="font-medium">Reason:</span>
                        <p className="mt-1 text-red-600 leading-relaxed">
                          {eventDetail.cancelledReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isCategoriesModalOpen && (
        <CategoryDialog
          onSave={handleAddCategory}
          closeModal={() => setIsCategoriesModalOpen(false)}
          initialCategories={eventDetail.categories}
          isModalOpen={isCategoriesModalOpen}
        />
      )}
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800";
    case "published":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
