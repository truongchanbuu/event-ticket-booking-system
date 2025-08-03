import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Trash2,
  Plus,
  ZoomOut,
  ZoomIn,
  Download,
} from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { UploadModal } from "./image-upload-modal";

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

// Next.js Image Component simulation (since we can't import actual Next.js Image)
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  isLazy?: boolean;
  onClick?: () => void;
}> = ({ src, alt, className, isLazy = true, onClick }) => (
  <Image
    fill
    priority={!isLazy}
    src={src}
    alt={alt}
    className={className}
    onClick={onClick}
    loading={isLazy ? "lazy" : undefined}
    style={{ width: "100%", height: "100%", objectFit: "cover" }}
  />
);

// Image Modal Component for fullscreen view
const ImageModal: React.FC<{
  image: ImageItem;
  isOpen: boolean;
  onClose: () => void;
  canNavigate?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}> = ({
  image,
  isOpen,
  onClose,
  canNavigate = false,
  onPrevious,
  onNext,
  currentIndex,
  totalCount,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  // Close modal with ESC key and manage body overflow
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (canNavigate && onPrevious && e.key === "ArrowLeft") onPrevious();
      if (canNavigate && onNext && e.key === "ArrowRight") onNext();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, canNavigate, onPrevious, onNext]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setZoom(1);
    }
  }, [isOpen]);

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
      {/* Header */}
      <div className="bg-black bg-opacity-80 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-white text-lg font-semibold">
            {image.name || image.alt || "Image"}
          </h2>
          <p className="text-gray-300 text-sm">
            {canNavigate && currentIndex !== undefined && totalCount
              ? `IMAGE ${currentIndex + 1} of ${totalCount}`
              : "IMAGE"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            disabled={zoom <= 0.5}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-2 text-sm min-w-[60px]"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            disabled={zoom >= 3}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-600 mx-2" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            title="Download"
          >
            <a href={image.src} download>
              <Download className="w-4 h-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {canNavigate && onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
          title="Previous Image (←)"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {canNavigate && onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
          title="Next Image (→)"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          <img
            src={image.src}
            alt={image.alt}
            className={`max-w-none object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              maxHeight: "calc(95vh - 120px)",
              width: "auto",
              height: "auto",
            }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm text-center">
        <p>
          Use zoom controls or scroll to navigate •{" "}
          {canNavigate ? "← → to change images • " : ""}Press ESC to close
        </p>
      </div>
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
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div
          className="relative aspect-video group mx-auto"
          style={{ maxHeight: "30vh" }}
        >
          <OptimizedImage
            isLazy={currentIndex !== 0}
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
        canNavigate={true}
        currentIndex={currentIndex}
        onNext={goToNext}
        onPrevious={goToPrevious}
        totalCount={images.length}
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
