"use client";

import * as React from "react";
import { CldUploadWidget } from "next-cloudinary";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_LIMIT_SIZE = 2_000_000;
const MAX_FILE = 1;

interface AvatarUploaderProps {
  username: string;
  photoUrl?: string | null;
  onUpload: (newUrl: string) => Promise<void>;
  /** Nếu true thì luôn bỏ qua preview và mở upload trực tiếp. */
  disablePreview?: boolean;
  /** Cloudinary unsigned preset; nếu không truyền sẽ lấy từ ENV. */
  uploadPreset?: string;
  /** Kích thước avatar (px); default 96 = ~w-24 h-24). */
  sizePx?: number;
  /** ClassName bổ sung cho wrapper */
  className?: string;
  /** Placeholder ảnh local khi không có photoUrl */
  fallbackImgSrc?: string;
}

export function AvatarUploader({
  username,
  photoUrl,
  onUpload,
  disablePreview = false,
  uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
  sizePx = 96,
  className,
  fallbackImgSrc = "https://avatar.iran.liara.run/public",
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const hasImage = Boolean(photoUrl) && !imgError;

  const handleUpload = async (result: any) => {
    if (result?.info?.secure_url) {
      const newUrl = result.info.secure_url as string;
      setIsUploading(true);
      try {
        await onUpload(newUrl);
        setIsPreviewOpen(false);
        setImgError(false);
      } catch (err) {
        console.error("[AvatarUploader] Failed to update avatar:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  /**
   * Khi user click vào avatar nhỏ:
   * - Nếu disablePreview hoặc không có ảnh / ảnh lỗi -> mở upload ngay.
   * - Ngược lại -> mở preview modal.
   */
  const handleAvatarClick = (openUpload: () => void) => {
    if (disablePreview || !hasImage) {
      openUpload();
    } else {
      setIsPreviewOpen(true);
    }
  };

  // Kích thước style inline để tránh phụ thuộc Tailwind fixed size
  const avatarStyle: React.CSSProperties = {
    width: sizePx,
    height: sizePx,
  };

  const displaySrc = hasImage ? (photoUrl as string) : fallbackImgSrc;

  return (
    <CldUploadWidget
      options={{
        sources: ["local"],
        clientAllowedFormats: ["jpg", "png", "jpeg", "webp"],
        maxFileSize: MAX_LIMIT_SIZE,
        maxFiles: MAX_FILE,
      }}
      uploadPreset={uploadPreset}
      onSuccess={handleUpload}
    >
      {({ open }) => (
        <>
          {/* Avatar nhỏ */}
          <div
            className={cn(
              "relative flex flex-col items-center gap-2",
              className
            )}
          >
            <div
              className="group cursor-pointer relative"
              style={avatarStyle}
              onClick={() => handleAvatarClick(open)}
            >
              <Avatar
                className={cn(
                  "rounded-full border-4 border-white shadow-lg w-full h-full",
                  !hasImage && "bg-muted"
                )}
              >
                <AvatarImage
                  src={displaySrc}
                  alt={`${username} Avatar`}
                  onError={() => setImgError(true)}
                />
                <AvatarFallback className="text-xl font-semibold">
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>

              {/* Overlay camera khi hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {!disablePreview && hasImage && (
            <>
              {/* CSS Styles */}
              <style>{`
                @keyframes backdropEnter {
                  0% {
                    opacity: 0;
                  }
                  100% {
                    opacity: 1;
                  }
                }

                @keyframes dialogEnter {
                  0% {
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                  }
                  100% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                  }
                }

                @keyframes imageEnter {
                  0% {
                    opacity: 0;
                    transform: scale(0.8) rotateX(10deg);
                  }
                  100% {
                    opacity: 1;
                    transform: scale(1) rotateX(0);
                  }
                }

                @keyframes buttonEnter {
                  0% {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  100% {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }

                /* Animate backdrop/overlay */
                :global([data-radix-dialog-overlay]) {
                  animation: backdropEnter 0.3s ease-out;
                }

                .modal-content {
                  animation: dialogEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
                    0.1s both;
                }

                .modal-image {
                  animation: imageEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)
                    0.3s both;
                }

                .modal-button {
                  animation: buttonEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
                    0.5s both;
                  transition: all 0.2s ease;
                }

                .modal-button:hover {
                  transform: translateY(-3px) scale(1.05);
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                }

                .modal-button:active {
                  transform: translateY(-1px) scale(1.02);
                }
              `}</style>

              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl bg-black/90 p-0 flex flex-col items-center modal-content">
                  <DialogTitle className="sr-only">Avatar Preview</DialogTitle>
                  <DialogDescription className="sr-only">
                    Preview and change your profile picture.
                  </DialogDescription>

                  <img
                    src={`${photoUrl}`}
                    alt={`${username} Avatar Preview`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        fallbackImgSrc;
                    }}
                    className="w-full max-h-[90vh] object-contain rounded-md modal-image"
                  />

                  <Button
                    type="button"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setTimeout(() => open(), 400);
                    }}
                    disabled={isUploading}
                    variant="default"
                    className="m-5 modal-button"
                  >
                    {isUploading ? "Uploading..." : "Change Picture"}
                  </Button>
                </DialogContent>
              </Dialog>
            </>
          )}
        </>
      )}
    </CldUploadWidget>
  );
}

/** Utility: lấy initials từ tên */
function getInitials(name = ""): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
