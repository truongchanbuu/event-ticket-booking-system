export const MAX_BIO_TEXT = 500;
export const MIN_BIO_TEXT = 10;
export const SUPPORT_FORMAT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".webp",
  ".heic",
  ".bmp",
  ".tiff",
];
export const IMAGE_FORMATS = SUPPORT_FORMAT.filter((ext) =>
  [".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp", ".tiff"].includes(ext)
);
export const IMAGE_FORMATS_SET = new Set(IMAGE_FORMATS);
export const MAX_FILE_SIZE_IN_MB = 2;
