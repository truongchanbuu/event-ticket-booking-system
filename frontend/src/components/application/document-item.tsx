"use client";

import { useState } from "react";
import { Download, Eye, FileText, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import Image from "next/image";
import { DocumentBase } from "@/schema";

type DocumentItemProps = {
  doc: DocumentBase;
};

export const DocumentItem: React.FC<DocumentItemProps> = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);
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
        <div className="flex space-x-2 flex-shrink-0">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
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
              {/* Custom Header */}
              <div className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <DialogTitle className="text-white text-lg font-semibold">
                    {doc.documentName}
                  </DialogTitle>
                  <DialogDescription className="text-gray-300 text-sm">
                    {doc.documentType?.toUpperCase()} Document
                  </DialogDescription>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-2">
                  <Button
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
                    variant="ghost"
                    size="sm"
                    onClick={resetZoom}
                    className="text-white hover:bg-white/20 px-3 py-2 text-sm min-w-[60px]"
                    title="Reset Zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </Button>

                  <Button
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

                  {/* Download Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 p-2"
                    title="Download"
                  >
                    <a href={doc.fileUrl} download>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>

                  {/* Close Button */}
                  <Button
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

              {/* Image Container */}
              <div className="flex items-center justify-center w-full h-full pt-20 pb-4 px-4 overflow-auto">
                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoom})` }}
                >
                  {/* Loading Indicator */}
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
                    className={`
                      max-w-none object-contain rounded-lg shadow-2xl transition-opacity duration-300
                      ${imageLoaded ? "opacity-100" : "opacity-0"}
                    `}
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

              {/* Navigation Hint */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm text-center">
                <p>
                  Use zoom controls or scroll to navigate • Press ESC to close
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Download"
          >
            <a
              href={doc.fileUrl}
              target="_blank"
              download
              title={doc.documentName}
            >
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </>
  );
};
