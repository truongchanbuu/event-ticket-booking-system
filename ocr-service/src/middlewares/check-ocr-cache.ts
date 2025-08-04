import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { redisClient } from "../lib/clients";
import { CachedOcrResult } from "../schema/ocr.schema";
import { HASH_PREFIX } from "../config/constants";

export const checkOcrCache = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const images = req.body.images as string[];
    const forceRerun = Boolean(req.body.force_rerun);

    if (!Array.isArray(images)) {
      return res.status(400).json({
        message: "Field 'images' must be an array of base64 strings.",
      });
    }

    req.imagesToProcess = [];
    req.cachedResults = [];

    const hashes = images.map((img) =>
      crypto.createHash("sha256").update(img).digest("hex")
    );
    const redisKeys = hashes.map((hash) => `${HASH_PREFIX}:${hash}`);

    if (forceRerun) {
      req.imagesToProcess = images.map((base64Image, index) => ({
        index,
        base64Image,
        hash: hashes[index],
      }));
      console.log(`[OCR Cache] Force rerun, skipping cache check.`);
      return next();
    }

    const cachedResultsFromRedis: (string | null)[] =
      redisKeys.length > 0 ? await redisClient.mget(redisKeys) : [];

    images.forEach((base64Image, index) => {
      const cachedData = cachedResultsFromRedis[index];
      const hash = hashes[index];

      if (cachedData) {
        try {
          const parsedResult: CachedOcrResult = JSON.parse(cachedData);
          req.cachedResults!.push({ index, result: parsedResult });
        } catch (e) {
          console.warn(`[OCR Cache] Invalid JSON at key ocr:sha256:${hash}`);
          req.imagesToProcess!.push({ index, base64Image, hash });
        }
      } else {
        req.imagesToProcess!.push({ index, base64Image, hash });
      }
    });

    console.log(
      `[OCR Cache] Found ${req.cachedResults.length}/${images.length} in cache.`
    );

    next();
  } catch (error) {
    console.error("[OCR Cache] Error:", error);
    next(error);
  }
};
