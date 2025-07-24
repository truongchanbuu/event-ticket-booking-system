import { Request, Response, NextFunction } from "express";
import { getUsage, incrementUsage, isLimitExceeded } from "../utils/orc-usage";
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

export const incrementOcrUsageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const count: number = res.locals.ocrImageCount || 0;

  for (let i = 0; i < count; i++) {
    const current = incrementUsage();
    if (current >= 290) {
      console.warn(
        `⚠️ OCR usage approaching limit: ${current}/${LIMIT_IMAGES}`
      );
    }
  }

  next();
};
