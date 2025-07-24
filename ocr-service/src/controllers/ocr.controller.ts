import { NextFunction, Request, Response } from "express";
import { extractTextFromImage } from "../services/ocr.service";

export const extractSingleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image || typeof base64Image !== "string") {
      return res.status(400).json({ message: "base64Image is required." });
    }

    const text = await extractTextFromImage(base64Image);

    res.locals.ocrImageCount = 1;

    res.json({ text });
    next();
  } catch (error) {
    console.error("[OCR] Error extracting text:", error);
    res.status(500).json({ message: "Failed to extract text from image." });
  }
};

export const extractMultipleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { images } = req.body;

  const results = await Promise.all(
    images.map(async (base64Image: string, index: number) => {
      try {
        const { fullText, confidence } = await extractTextFromImage(
          base64Image
        );

        const status = confidence < 0.7 ? "blurry" : "ok";
        return { index, status, text: fullText, confidence };
      } catch (err) {
        return { index, status: "failed", text: null, confidence: null };
      }
    })
  );

  const successfulCount = results.filter((r) => r.status !== "failed").length;
  res.locals.ocrImageCount = successfulCount;
  return res.json(results);
  next();
};
