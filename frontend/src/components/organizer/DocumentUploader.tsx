import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  File,
  Camera,
  Edit3,
} from "lucide-react";
import { Label } from "../ui/label";
import Image from "next/image";
import { Input } from "../ui/input";
import {
  IMAGE_FORMATS_SET,
  MAX_FILE_SIZE_IN_MB,
  SUPPORT_FORMAT,
} from "@/constants/application";
import {
  fileToBase64,
  formatFileSize,
  getFileExtension,
} from "@/lib/helpers/file.helper";
import { FileValue } from "@/schema/common";

export interface DocumentUploaderProps {
  label: string;
  required?: boolean;
  value?: FileValue | null;
  onChange: (file: FileValue | null) => void;
  error?: string;
  acceptedFormats?: string[];
  maxSizeInMB?: number;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  required = false,
  value,
  onChange,
  error,
  acceptedFormats = SUPPORT_FORMAT,
  maxSizeInMB = MAX_FILE_SIZE_IN_MB,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string>("");

  const isImageFile = useCallback(
    (fileName: string): boolean =>
      IMAGE_FORMATS_SET.has(getFileExtension(fileName)),
    []
  );

  const previewUrl = useMemo(() => {
    if (value && isImageFile(value.file.name)) {
      return value.base64;
    }
    return null;
  }, [value, isImageFile]);

  useEffect(() => {
    if (previewUrl) {
      const url = URL.createObjectURL(value.file);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [value, isImageFile]);

  // Validation functions
  const validateFile = useCallback(
    (file: File): string => {
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        return `File size must be less than ${maxSizeInMB}MB`;
      }

      const fileExtension = getFileExtension(file.name);
      if (!acceptedFormats.includes(fileExtension)) {
        return `File type not supported. Accepted formats: ${acceptedFormats.join(", ")}`;
      }
      return "";
    },
    [acceptedFormats, maxSizeInMB]
  );

  const handlePreviewClick = () => {
    if (previewUrl) {
      setIsModalOpen(true);
    } else if (value) {
      setNotification("Preview only for images.");
      setTimeout(() => {
        setNotification("");
      }, 3000);
    }
  };

  const handleFileSelection = useCallback(
    async (file: File) => {
      // <-- Chuyển thành hàm async
      const error = validateFile(file);
      setValidationError(error);

      if (!error) {
        try {
          const base64 = await fileToBase64(file);
          onChange({ file, base64 });
        } catch (err) {
          setValidationError("Could not read the file.");
          onChange(null);
        }
      } else {
        onChange(null);
      }
    },
    [validateFile, onChange]
  );

  const acceptAttr = useMemo(
    () => acceptedFormats.join(","),
    [acceptedFormats]
  );

  const getFileTypeIcon = useCallback((fileName: string) => {
    if (isImageFile(fileName)) {
      return <ImageIcon className="w-16 h-16 text-gray-400" />;
    }
    return <File className="w-16 h-16 text-gray-400" />;
  }, []);

  const fileTypeIcon = useMemo(
    () => (value ? getFileTypeIcon(value.file.name) : null),
    [value]
  );

  // Drag and drop handlers
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
      handleFileSelection(files[0]);
    }
  };

  const handleRemoveFile = () => {
    onChange(null);
    setValidationError("");
  };

  const hasError = !!(error || validationError);
  const hasValidFile = value && !validationError;

  return (
    <div className="space-y-3">
      {/* Label */}
      <Label
        htmlFor="file-upload"
        className="block text-sm font-semibold text-gray-900"
      >
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
            : hasError
              ? "border-red-300 bg-red-50"
              : hasValidFile
                ? "border-green-300 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <AnimatePresence>
          {!hasValidFile ? (
            // Empty state or error state
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
                  Supports: {acceptAttr.toUpperCase()} (Max {maxSizeInMB}MB)
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
            // File uploaded state
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4"
            >
              {/* Large Preview with Hover Overlay */}
              <div
                className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden cursor-pointer group"
                onClick={handlePreviewClick}
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    fill
                    alt="Document preview"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                    {fileTypeIcon}
                    <p className="text-xs text-gray-500 mt-2 text-center px-2 truncate max-w-full">
                      {value.file.name}
                    </p>
                  </div>
                )}

                {/* Success Badge */}
                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-20">
                  <Check className="w-4 h-4 text-white" />
                </div>

                {/* Hover Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-between p-4 z-10"
                >
                  {/* File Info */}
                  <div className="text-white">
                    <p className="text-sm font-medium truncate mb-1">
                      {value.file.name}
                    </p>
                    <p className="text-xs opacity-90">
                      {formatFileSize(value.file.size)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-300 font-medium">
                        Uploaded successfully
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        inputRef.current?.click();
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-3 bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 rounded-full transition-all duration-200 group"
                      title="Change file"
                    >
                      <Edit3 className="w-5 h-5 text-white group-hover:text-blue-200" />
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-3 bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 rounded-full transition-all duration-200 group"
                      title="Remove file"
                    >
                      <X className="w-5 h-5 text-white group-hover:text-red-300" />
                    </motion.button>
                  </div>
                </motion.div>
              </div>

              {/* Change File Button (always visible) */}
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
        </AnimatePresence>
      </div>

      {/* Hidden File Input */}
      <Input
        id="file-upload"
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelection(file);
          }
        }}
      />

      {/* Error Messages */}
      {hasError && (
        <motion.div
          title="Remove file"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200"
        >
          <X className="w-4 h-4" />
          <motion.div role="alert">{error || validationError}</motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {isModalOpen && previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)} // Nhấn ra ngoài để đóng
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()} // Ngăn việc nhấn vào ảnh cũng đóng modal
            >
              <Image
                src={previewUrl}
                width={1200}
                height={800}
                alt="Xem trước ảnh"
                className="object-contain w-auto h-auto max-w-full max-h-[90vh] rounded-lg"
                style={{ width: "auto", height: "auto" }}
              />
            </motion.div>
            <motion.button
              type="button"
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
              onClick={() => setIsModalOpen(false)}
              aria-label="Đóng"
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentUploader;
