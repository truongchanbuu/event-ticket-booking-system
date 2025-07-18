import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  File,
  Camera,
} from "lucide-react";
import { Label } from "../ui/label";
import Image from "next/image";
import { Input } from "../ui/input";

interface DocumentUploaderProps {
  label: string;
  required?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  required,
  value,
  onChange,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  React.useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onChange(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-3">
      <Label className="block text-sm font-semibold text-gray-900">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : error
              ? "border-red-300 bg-red-50"
              : value
                ? "border-green-300 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        {!value ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center"
          >
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isDragOver ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              {isDragOver ? (
                <Upload className="w-8 h-8 text-blue-600" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                {isDragOver ? "Drop your file here" : "Upload your document"}
              </p>
              <p className="text-xs text-gray-500">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Supports: JPG, PNG, PDF (Max 10MB)
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => inputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
            >
              <Camera className="w-4 h-4" />
              Choose File
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6"
          >
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative flex-shrink-0">
                {preview ? (
                  <Image
                    src={preview}
                    alt="Document preview"
                    className="w-24 h-24 object-cover rounded-lg shadow-md border border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <File className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                {/* Success Badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {value.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(value.size)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Uploaded successfully
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <motion.button
                    type="button"
                    onClick={() => onChange(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Change File Button */}
            <motion.button
              type="button"
              onClick={() => inputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Change File
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Hidden Input */}
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onChange(file);
        }}
      />

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200"
        >
          <X className="w-4 h-4" />
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default DocumentUploader;
