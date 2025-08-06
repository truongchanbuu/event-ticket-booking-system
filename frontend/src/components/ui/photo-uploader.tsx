// components/photo-uploader.tsx
import { Camera, Upload, X } from "lucide-react";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { UseFormReturn } from "react-hook-form";
import { EventContributor } from "@/schema";
import { FormItem, FormLabel } from "@/components/ui/form";

interface PhotoUploaderProps {
  form: UseFormReturn<EventContributor>;
  initialPhotoUrl?: string | null;
}

export const PhotoUploader = ({
  form,
  initialPhotoUrl,
}: PhotoUploaderProps) => {
  const {
    photoPreview,
    isDragOver,
    handlePhotoChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removePhoto,
  } = usePhotoUpload(form, initialPhotoUrl);

  return (
    <FormItem>
      <FormLabel className="text-sm font-medium text-gray-700 mb-3 block">
        Profile Picture
      </FormLabel>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {photoPreview ? (
            <div className="relative group">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div
          className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-6 h-6 text-gray-400" />
            <div className="text-sm">
              <span className="font-medium text-blue-600 hover:text-blue-500">
                Click to upload
              </span>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
          </label>
        </div>
      </div>
    </FormItem>
  );
};
