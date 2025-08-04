import { Request, Response, NextFunction } from "express";
import { getUsage, incrementUsage, isLimitExceeded } from "../utils/ocr-usage";
import { LIMIT_IMAGES } from "../config/constants";

export const checkOcrQuota = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isLimitExceeded()) {
    return res.status(403).json({
      message: `OCR quota exceeded. Used: ${getUsage()} / ${LIMIT_IMAGES}. Wait for demo.`,
    });
  }

  next();
};

/**
 * Middleware này không trực tiếp tăng quota. Thay vào đó, nó đính kèm một
 * trình lắng nghe sự kiện vào response. Trình lắng nghe này sẽ chỉ được
 * kích hoạt KHI response đã được gửi đi thành công.
 *
 * Điều này đảm bảo chúng ta chỉ đếm các request OCR thành công.
 */
export const trackOcrUsageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const onFinish = () => {
    const count: number = res.locals.ocrImageCount || 0;

    if (count > 0) {
      console.log(
        `[Usage] Incrementing OCR quota by ${count} for request: ${req.method} ${req.originalUrl}`
      );

      for (let i = 0; i < count; i++) {
        const currentUsage = incrementUsage(); // Gọi hàm tăng quota của bạn

        if (currentUsage >= 290) {
          console.warn(
            `⚠️ OCR usage approaching limit: ${currentUsage}/${LIMIT_IMAGES}`
          );
        }
      }
    }

    res.removeListener("finish", onFinish);
  };

  res.on("finish", onFinish);

  next();
};
