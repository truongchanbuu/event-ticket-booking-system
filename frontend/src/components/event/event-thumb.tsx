import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const SLIDER_INTERVAL_TIME = 3000;

interface EventThumbnailProps {
  thumbnails: string[];
  eventName?: string;
  eventDesc?: string;
  onEventClick?: () => void;
}

export default function EventThumbnail({
  thumbnails,
  eventName,
  eventDesc,
}: EventThumbnailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAutoPlaying || isModalOpen || thumbnails.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) =>
        prev === thumbnails.length - 1 ? 0 : prev + 1
      );
    }, SLIDER_INTERVAL_TIME);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isModalOpen, thumbnails.length]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) =>
          prev === 0 ? thumbnails.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) =>
          prev === thumbnails.length - 1 ? 0 : prev + 1
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, thumbnails.length]);

  const nextImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === thumbnails.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? thumbnails.length - 1 : prev - 1
    );
  };

  const goToSlide = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const openModal = () => {
    setIsModalOpen(true);
    setIsAutoPlaying(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsAutoPlaying(true);
  };

  return (
    <>
      <div
        className="bg-white rounded-xxl shadow-lg overflow-hidden cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        onClick={openModal}
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Image Slider */}
        <div className="relative h-56 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {thumbnails.map((image, index) => (
              <img
                key={`${eventName}-${index}-${image}`}
                src={image}
                alt={`${eventName} - Image ${index + 1}${eventDesc ? ` - ${eventDesc}` : ""}`}
                className="w-full h-full object-cover flex-shrink-0"
              />
            ))}
          </div>

          {thumbnails.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="z-10 absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextImage}
                className="z-10 absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Slide Indicators */}
          {thumbnails.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1">
              {thumbnails.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => goToSlide(index, e)}
                  className={`z-10 w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex
                      ? "bg-white scale-125"
                      : "bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-5xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 rounded-full p-2 z-10"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev button */}
            {thumbnails.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next button */}
            {thumbnails.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <img
              src={thumbnails[currentImageIndex]}
              alt="Full Image"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
