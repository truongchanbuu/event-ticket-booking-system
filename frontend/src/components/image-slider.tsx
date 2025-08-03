import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { ConfirmDeleteModal } from "./ui/confirm-dialog";

// TypeScript interfaces
export interface ImageItem {
  id: string;
  src: string;
  alt: string;
  name: string;
  file?: File;
}

// Helper function to convert URLs to ImageItem objects
export const createImageFromUrl = (
  url: string,
  customName?: string
): ImageItem => {
  // Extract filename from URL
  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];
  const filename = lastPart.split("?")[0]; // Remove query parameters

  // Generate a meaningful name
  const name =
    customName ||
    (filename.includes(".") ? filename : `image-${Date.now()}.jpg`);

  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    src: url,
    alt: name.replace(/\.[^/.]+$/, ""), // Remove extension for alt text
    name: name,
  };
};

// Helper function to convert multiple URLs to ImageItem array
export const createImagesFromUrls = (
  urls: string[],
  customNames?: string[]
): ImageItem[] => {
  return urls.map((url, index) =>
    createImageFromUrl(url, customNames?.[index])
  );
};

interface ImageSliderProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  onSave: (images: ImageItem[]) => Promise<void>;
}

interface ImageModalProps {
  image: ImageItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UploadModalProps {
  images: ImageItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (images: ImageItem[]) => Promise<void>;
  onImagesChange: (images: ImageItem[]) => void;
}

// Next.js Image Component simulation (since we can't import actual Next.js Image)
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className, onClick }) => (
  <Image
    fill
    src={src}
    alt={alt}
    className={className}
    onClick={onClick}
    loading="lazy"
    style={{ width: "100%", height: "100%", objectFit: "cover" }}
  />
);

// Image Modal Component for fullscreen view
const ImageModal: React.FC<ImageModalProps> = ({ image, isOpen, onClose }) => {
  // Close modal with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
      >
        <X size={24} />
      </button>
      <div className="max-w-screen-lg max-h-screen-lg p-4">
        <OptimizedImage
          src={image.src}
          alt={image.alt}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
};

// Upload Modal Component
const UploadModal: React.FC<UploadModalProps> = ({
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
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                >
                  <OptimizedImage
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />

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
              ))}
            </div>
          )}

          <div className="my-2 flex justify-end">
            <Button loading={isSaving} variant="secondary" onClick={handleSave}>
              Save
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

// Main Image Slider Component
export const ImageSlider: React.FC<ImageSliderProps> = ({
  images,
  onSave,
  onImagesChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [goToPrevious, goToNext]);

  if (images.length === 0) {
    return (
      <div className="w-full mx-auto">
        <div className="text-center py-12">
          <Upload className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No Images Yet
          </h2>
          <p className="text-gray-500 mb-6">
            Upload some images to get started
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={20} className="mr-2" />
            Upload Images
          </button>
        </div>

        <UploadModal
          onSave={onSave}
          images={images}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onImagesChange={onImagesChange}
        />
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="w-full mx-auto h-full">
      {/* Main Slider */}
      <div className="relative group bg-gray-100 rounded-lg overflow-hidden h-[30vh]">
        <div className="relative aspect-video">
          <OptimizedImage
            src={currentImage.src}
            alt={currentImage.alt}
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setIsModalOpen(true)}
          />

          {/* Upload/Manage Button - Icon only with overlay */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="relative group/upload"
            >
              {/* Light overlay background */}
              <div className="absolute inset-0 bg-black bg-opacity-20 rounded-full"></div>
              {/* Icon button */}
              <div className="relative w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 hover:scale-105 shadow-lg">
                <Upload size={18} className="text-gray-700" />
              </div>
            </button>
          </div>

          {/* Navigation Buttons - Show on hover with circle background */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-all duration-200">
                    <ChevronLeft size={24} className="text-white" />
                  </div>
                </div>
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-all duration-200">
                    <ChevronRight size={24} className="text-white" />
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white scale-110"
                    : "bg-white bg-opacity-50 hover:bg-opacity-75"
                }`}
              />
            ))}
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black bg-opacity-50 text-white text-sm rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Modals */}
      <ImageModal
        image={currentImage}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <UploadModal
        onSave={onSave}
        images={images}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImagesChange={onImagesChange}
      />
    </div>
  );
};
