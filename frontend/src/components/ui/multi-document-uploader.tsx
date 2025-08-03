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
  Plus,
  Trash2,
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

export interface MultipleDocumentUploaderProps {
  label: string;
  required?: boolean;
  value?: FileValue[];
  onChange: (files: FileValue[]) => void;
  error?: string;
  acceptedFormats?: string[];
  maxSizeInMB?: number;
  maxFiles?: number;
}

export const MultipleDocumentUploader: React.FC<
  MultipleDocumentUploaderProps
> = ({
  label,
  required = false,
  value = [],
  onChange,
  error,
  acceptedFormats = SUPPORT_FORMAT,
  maxSizeInMB = MAX_FILE_SIZE_IN_MB,
  maxFiles = 10,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    fileName: string;
  }>({ isOpen: false, imageUrl: null, fileName: "" });
  const [notification, setNotification] = useState<string>("");
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);

  const isImageFile = useCallback(
    (fileName: string): boolean =>
      IMAGE_FORMATS_SET.has(getFileExtension(fileName)),
    []
  );

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

  const validateMultipleFiles = useCallback(
    (files: File[]): { validFiles: File[]; errors: string[] } => {
      const errors: string[] = [];
      const validFiles: File[] = [];

      // Check max files limit
      const currentCount = value?.length || 0;
      if (currentCount + files.length > maxFiles) {
        errors.push(
          `Maximum ${maxFiles} files allowed. Current: ${currentCount}, Adding: ${files.length}`
        );
        return { validFiles: [], errors };
      }

      // Check for duplicate files
      const existingFileNames = new Set((value || []).map((v) => v.file.name));

      files.forEach((file) => {
        if (existingFileNames.has(file.name)) {
          errors.push(`File "${file.name}" already exists`);
          return;
        }

        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
          existingFileNames.add(file.name);
        }
      });

      return { validFiles, errors };
    },
    [validateFile, value, maxFiles]
  );

  const handlePreviewClick = (fileValue: FileValue) => {
    if (isImageFile(fileValue.file.name)) {
      setPreviewModal({
        isOpen: true,
        imageUrl: fileValue.base64,
        fileName: fileValue.file.name,
      });
    } else {
      setNotification("Preview only available for images.");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const handleFileSelection = useCallback(
    async (files: File[]) => {
      const { validFiles, errors } = validateMultipleFiles(files);

      if (errors.length > 0) {
        setValidationError(errors.join(", "));
        setTimeout(() => setValidationError(""), 5000);
      }

      if (validFiles.length === 0) return;

      // Add files to processing state
      const fileNames = validFiles.map((f) => f.name);
      setProcessingFiles((prev) => [...prev, ...fileNames]);

      try {
        const newFileValues: FileValue[] = [];

        for (const file of validFiles) {
          try {
            const base64 = await fileToBase64(file);
            newFileValues.push({ file, base64 });
          } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
          }
        }

        if (newFileValues.length > 0) {
          onChange([...value, ...newFileValues]);
        }
      } catch (err) {
        setValidationError("Could not process some files.");
      } finally {
        // Remove files from processing state
        setProcessingFiles((prev) =>
          prev.filter((name) => !fileNames.includes(name))
        );
      }
    },
    [validateMultipleFiles, onChange, value]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles);
      setValidationError("");
    },
    [value, onChange]
  );

  const handleRemoveAllFiles = useCallback(() => {
    onChange([]);
    setValidationError("");
  }, [onChange]);

  const acceptAttr = useMemo(
    () => acceptedFormats.join(","),
    [acceptedFormats]
  );

  const getFileTypeIcon = useCallback(
    (fileName: string) => {
      if (isImageFile(fileName)) {
        return <ImageIcon className="w-8 h-8 text-gray-400" />;
      }
      return <File className="w-8 h-8 text-gray-400" />;
    },
    [isImageFile]
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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files);
    }
  };

  const hasError = !!(error || validationError);
  const hasFiles = value && value.length > 0;
  const canAddMore = !value || value.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor="multiple-file-upload"
          className="block text-sm font-semibold text-gray-900"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {hasFiles && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              {value?.length || 0} / {maxFiles} files
            </span>
            {value && value.length > 1 && (
              <button
                type="button"
                onClick={handleRemoveAllFiles}
                className="text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : hasError
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-center"
          >
            <div
              className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                isDragOver ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              {isDragOver ? (
                <Upload className="w-6 h-6 text-blue-600" />
              ) : (
                <Plus className="w-6 h-6 text-gray-400" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {isDragOver
                  ? "Drop your files here"
                  : hasFiles
                    ? "Add more documents"
                    : "Upload your documents"}
              </p>
              <p className="text-xs text-gray-500">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Supports: {acceptAttr.toUpperCase()} (Max {maxSizeInMB}MB each,{" "}
                {maxFiles} files total)
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => inputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
            >
              <Camera className="w-4 h-4" />
              Choose Files
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Files Grid */}
      {hasFiles && value && value.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {value.map((fileValue, index) => {
              console.log(
                "Rendering file:",
                fileValue.file.name,
                "Base64 length:",
                fileValue.base64?.length
              );
              return (
                <motion.div
                  key={`${fileValue.file.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* File Preview */}
                  <div
                    className="relative h-32 cursor-pointer group"
                    onClick={() => handlePreviewClick(fileValue)}
                  >
                    {isImageFile(fileValue.file.name) && fileValue.base64 ? (
                      <Image
                        src={fileValue.base64}
                        fill
                        alt={fileValue.file.name}
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
                        {getFileTypeIcon(fileValue.file.name)}
                        <p className="text-xs text-gray-500 mt-1 text-center px-2 truncate max-w-full">
                          {fileValue.file.name}
                        </p>
                      </div>
                    )}

                    {/* Success Badge */}
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 text-white" />
                    </div>

                    {/* Remove Button */}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-2 left-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                      title="Remove file"
                    >
                      <X className="w-3 h-3 text-white" />
                    </motion.button>
                  </div>

                  {/* File Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {fileValue.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileValue.file.size)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Uploaded
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Processing Files */}
          {processingFiles.map((fileName) => (
            <motion.div
              key={`processing-${fileName}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                  {fileName}
                </p>
                <p className="text-xs text-blue-600">Processing...</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <Input
        id="multiple-file-upload"
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileSelection(files);
          }
          // Reset input value to allow selecting the same file again
          e.target.value = "";
        }}
      />

      {/* Error Messages */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200"
        >
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div role="alert" className="flex-1">
            {error || validationError}
          </div>
        </motion.div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewModal.isOpen && previewModal.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() =>
              setPreviewModal({ isOpen: false, imageUrl: null, fileName: "" })
            }
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={previewModal.imageUrl}
                width={1200}
                height={800}
                alt={previewModal.fileName}
                className="object-contain w-auto h-auto max-w-full max-h-[90vh] rounded-lg"
                style={{ width: "auto", height: "auto" }}
              />
            </motion.div>
            <motion.button
              type="button"
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
              onClick={() =>
                setPreviewModal({ isOpen: false, imageUrl: null, fileName: "" })
              }
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
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

export default MultipleDocumentUploader;
