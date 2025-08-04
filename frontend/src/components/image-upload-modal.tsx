import { useCallback, useEffect, useState } from "react";

import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmDeleteModal } from "./ui/confirm-dialog";
import { ImageItem, OptimizedImage } from "./image-slider";

interface UploadModalProps {
  images: ImageItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (images: ImageItem[]) => Promise<void>;
  onImagesChange: (images: ImageItem[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  images,
  isOpen,
  onSave,
  onClose,
  onImagesChange,
}) => {
  const [confirmDelete, setConfrimDelete] = useState<{
    confirm: boolean;
    id?: string;
  }>({
    confirm: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Track changes
  const [originalImages, setOriginalImages] = useState<ImageItem[]>([]);
  const [changes, setChanges] = useState<{
    added: ImageItem[];
    deleted: ImageItem[];
  }>({
    added: [],
    deleted: [],
  });

  // Initialize original images when modal opens
  useEffect(() => {
    if (isOpen && originalImages.length === 0) {
      setOriginalImages([...images]);
      setChanges({ added: [], deleted: [] });
    }
  }, [isOpen, images, originalImages.length]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOriginalImages([]);
      setChanges({ added: [], deleted: [] });
    }
  }, [isOpen]);

  // Calculate changes whenever images change
  useEffect(() => {
    if (originalImages.length === 0) return;

    const currentImageIds = new Set(images.map((img) => img.id));
    const originalImageIds = new Set(originalImages.map((img) => img.id));

    // Find added images
    const added = images.filter((img) => !originalImageIds.has(img.id));

    // Find deleted images
    const deleted = originalImages.filter(
      (img) => !currentImageIds.has(img.id)
    );

    setChanges({ added, deleted });
  }, [images, originalImages]);

  // Check if there are any changes
  const hasChanges = changes.added.length > 0 || changes.deleted.length > 0;

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);
      const promises = fileArray.map((file) => {
        return new Promise<ImageItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: Date.now() + Math.random().toString(36).substr(2, 9),
              src: e.target?.result as string,
              alt: file.name,
              name: file.name,
              file: file,
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then((newImages) => {
        onImagesChange([...images, ...newImages]);
      });
    },
    [images, onImagesChange]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Handle file input
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFileUpload(e.target.files);
      }
    },
    [handleFileUpload]
  );

  // Delete image
  const deleteImage = useCallback(
    (imageId?: string) => {
      if (imageId) {
        onImagesChange(images.filter((img) => img.id !== imageId));
      }
    },
    [images, onImagesChange]
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(images);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset changes - revert to original state
  const handleReset = () => {
    onImagesChange([...originalImages]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Manage Images</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Changes Summary */}
          {hasChanges && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900">Pending Changes</h3>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Reset All Changes
                </button>
              </div>
              <div className="space-y-1 text-sm text-blue-800">
                {changes.added.length > 0 && (
                  <div className="flex items-center">
                    <Plus size={16} className="mr-2 text-green-600" />
                    <span>{changes.added.length} image(s) will be added</span>
                  </div>
                )}
                {changes.deleted.length > 0 && (
                  <div className="flex items-center">
                    <Trash2 size={16} className="mr-2 text-red-600" />
                    <span>
                      {changes.deleted.length} image(s) will be removed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 mb-4">
              Drag and drop images here, or click to select files
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Plus size={20} className="mr-2" />
              Add Images
            </label>
          </div>

          {/* Optimized Image Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {images.map((image) => {
                const isNew = changes.added.some((img) => img.id === image.id);

                return (
                  <div
                    key={image.id}
                    className={`relative group aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 ${
                      isNew ? "ring-2 ring-green-400 ring-opacity-60" : ""
                    }`}
                  >
                    <OptimizedImage
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />

                    {/* New image indicator */}
                    {isNew && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-medium">
                        NEW
                      </div>
                    )}

                    {/* Overlay for better button visibility */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

                    {/* Delete button */}
                    <button
                      onClick={() =>
                        setConfrimDelete({ confirm: true, id: image.id })
                      }
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full 
                       opacity-0 group-hover:opacity-100 transition-all duration-200 
                       shadow-lg hover:shadow-xl transform hover:scale-110
                       focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                      aria-label={`Delete image ${image.alt || "image"}`}
                      type="button"
                    >
                      <Trash2 size={16} className="drop-shadow-sm" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              loading={isSaving}
              variant="secondary"
              onClick={handleSave}
              disabled={!hasChanges}
              className={!hasChanges ? "opacity-50 cursor-not-allowed" : ""}
            >
              {hasChanges ? "Save Changes" : "No Changes"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        title="Delete Image"
        description="Do you really want to delete this image?"
        onCancel={() => setConfrimDelete({ confirm: false, id: undefined })}
        onConfirm={() => {
          deleteImage(confirmDelete.id);
          setConfrimDelete({ confirm: false, id: undefined });
        }}
        open={confirmDelete.confirm}
      />
    </div>
  );
};
