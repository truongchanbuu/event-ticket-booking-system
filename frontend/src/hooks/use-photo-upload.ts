import { useState, useCallback, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { EventContributor } from "@/schema";

export const usePhotoUpload = (
  form: UseFormReturn<EventContributor>,
  initialPhotoUrl?: string | null
) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialPhotoUrl || null
  );
  const [isDragOver, setIsDragOver] = useState(false);

  // Destructure để lấy hàm có tham chiếu ổn định
  const { setValue } = form;

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setValue("photo", file, { shouldValidate: true });
        setPhotoPreview(URL.createObjectURL(file));
      }
    },
    [setValue]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        setValue("photo", file, { shouldValidate: true });
        setPhotoPreview(URL.createObjectURL(file));
      }
    },
    [setValue]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoPreview(null);
    setValue("photo", undefined, { shouldValidate: true });
  }, [setValue]);

  // Cập nhật preview khi initialPhotoUrl thay đổi (quan trọng khi edit)
  useEffect(() => {
    setPhotoPreview(initialPhotoUrl || null);
  }, [initialPhotoUrl]);

  return {
    photoPreview,
    isDragOver,
    handlePhotoChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removePhoto,
  };
};
