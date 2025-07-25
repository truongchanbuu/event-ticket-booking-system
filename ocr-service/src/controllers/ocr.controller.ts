// controllers/ocr.controller.ts

import { Request, Response, NextFunction } from "express";
import { redisClient } from "../lib/clients";
import { processImageBatch } from "../services/ocr.service";
import { HASH_PREFIX } from "../config/constants";

export const processOcrController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { imagesToProcess, cachedResults } = req;
    const newResultsWithMeta = await processImageBatch(imagesToProcess!);

    if (newResultsWithMeta.length > 0) {
      const successfulResults = newResultsWithMeta.filter(
        (r) => r.status !== "failed"
      );

      if (successfulResults.length > 0) {
        const itemsToCacheObject = successfulResults.reduce(
          (acc, result) => {
            const { hash, index, ...dataToCache } = result;
            const key = `${HASH_PREFIX}:${hash}`;
            const value = JSON.stringify(dataToCache);
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string> // Khởi tạo accumulator là một object rỗng
        );

        await redisClient.mset(itemsToCacheObject);

        const keysToSetExpiry = Object.keys(itemsToCacheObject);
        const pipeline = redisClient.multi();
        keysToSetExpiry.forEach((key) => {
          pipeline.expire(key, 604800); // 1 tuần
        });
        await pipeline.exec();
      }
    }

    const standardizedCachedResults = cachedResults!.map((item) => ({
      index: item.index,
      ...item.result,
    }));

    const standardizedNewResults = newResultsWithMeta.map((item) => ({
      index: item.index,
      status: item.status,
      text: item.text,
      confidence: item.confidence,
    }));

    const allResults = [
      ...standardizedCachedResults,
      ...standardizedNewResults,
    ];

    allResults.sort((a, b) => a.index - b.index);

    res.locals.ocrImageCount = newResultsWithMeta.filter(
      (r) => r.status !== "failed"
    ).length;

    res.status(200).json({ results: allResults });
  } catch (error) {
    next(error);
  }
};
