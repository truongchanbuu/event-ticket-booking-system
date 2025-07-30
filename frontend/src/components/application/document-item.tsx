"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "../ui/dialog";
import Image from "next/image";
import { DocumentBase } from "@/schema";
import { Input } from "../ui/input";

type DocumentItemProps = {
  doc: DocumentBase;
  canEdit?: boolean;
  isUploading?: boolean;
  onDownload?: () => void;
  onDelete?: (doc: DocumentBase) => void;
  onUpdate?: (file: File, currentDoc: DocumentBase) => void;
};

export const DocumentItem: React.FC<DocumentItemProps> = ({
  doc,
  canEdit = false,
  isUploading = false,
  onDelete,
  onUpdate,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };
  return (
    <>
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3 overflow-hidden">
          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">
              {doc.documentName}
            </p>
            <p className="text-xs text-gray-500">
              {doc.documentType?.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex space-x-2 flex-shrink-0 items-center">
          {/* View button */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsOpen(true);
                  setImageLoaded(false);
                  setZoom(1);
                }}
                className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="View Document"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 bg-black/95 border-none">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <DialogTitle className="text-white text-lg font-semibold">
                    {doc.documentName}
                  </DialogTitle>
                  <DialogDescription className="text-gray-300 text-sm">
                    {doc.documentType?.toUpperCase()} Document
                  </DialogDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    className="text-white hover:bg-white/20 p-2"
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
                    className="text-white hover:bg-white/20 px-3 py-2 text-sm min-w-[60px]"
                    title="Reset Zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    className="text-white hover:bg-white/20 p-2"
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
                    className="text-white hover:bg-white/20 p-2"
                    title="Download"
                  >
                    <a href={doc.fileUrl} download>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 p-2"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex items-center justify-center w-full h-full pt-20 pb-4 px-4 overflow-auto">
                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoom})` }}
                >
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                  <Image
                    src={doc.fileUrl}
                    alt={doc.documentName}
                    width={1200}
                    height={800}
                    className={`max-w-none object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      maxHeight: "calc(95vh - 120px)",
                      width: "auto",
                      height: "auto",
                    }}
                    onLoad={() => setImageLoaded(true)}
                    priority
                  />
                </div>
              </div>

              {/* Hint */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm text-center">
                <p>
                  Use zoom controls or scroll to navigate • Press ESC to close
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Download */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Download"
          >
            <a href={doc.fileUrl} target="_blank" download>
              <Download className="w-4 h-4" />
            </a>
          </Button>

          {/* Update Button (nếu cần) */}
          {canEdit && onUpdate && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                id={`replace-${doc.documentType}`}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdate(file, doc);
                }}
              />

              <label htmlFor={`replace-${doc.documentType}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClick}
                  className="text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 transition-colors cursor-pointer"
                  title="Replace"
                >
                  ✏️
                </Button>
              </label>
            </>
          )}

          {/* Delete Button */}
          {canEdit && onDelete && (
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <DialogTitle className="text-base">
                    Delete Document?
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete{" "}
                  <strong>{doc.documentName}</strong>? This action cannot be
                  undone.
                </p>
                <DialogFooter className="mt-4 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-4 py-2"
                    onClick={() => setIsConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="px-4 py-2 text-white"
                    onClick={() => {
                      onDelete(doc);
                      setIsConfirmOpen(false);
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
};
