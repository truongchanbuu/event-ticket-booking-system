// import { Request, Response, NextFunction } from "express";
// import crypto from "crypto";
// import { redisClient } from "@/lib/redis";

// export const checkOcrCache = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const images = req.body.images as string[];

//   req.body.hashes = [];
//   req.body.ocrResultsFromCache = [];

//   for (const base64Image of images) {
//     const hash = crypto.createHash("sha256").update(base64Image).digest("hex");

//     req.body.hashes.push(hash);

//     const cached = await redisClient.get(`ocr:${hash}`);
//     if (cached) {
//       req.body.ocrResultsFromCache.push({
//         hash,
//         result: JSON.parse(cached),
//       });
//     } else {
//       req.body.ocrResultsFromCache.push(null);
//     }
//   }

//   next();
// };
