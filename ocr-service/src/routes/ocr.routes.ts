import { Router } from "express";
import { validateBody } from "../middlewares/validate";
import {
  extractMultipleTextSchema,
  extractTextSchema,
} from "../schema/ocr.schema";
import { processOcrController } from "../controllers/ocr.controller";
import {
  checkOcrQuota,
  trackOcrUsageMiddleware,
} from "../middlewares/check-ocr-usage";
import { checkOcrCache } from "../middlewares/check-ocr-cache";

const router = Router();

router.post(
  "/extract-text",
  validateBody(extractTextSchema),
  checkOcrQuota,
  checkOcrCache,
  processOcrController,
  trackOcrUsageMiddleware
);

export default router;
