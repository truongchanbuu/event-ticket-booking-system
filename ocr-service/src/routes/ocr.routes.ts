import { Router } from "express";
import { validateBody } from "../middlewares/validate";
import {
  extractMultipleTextSchema,
  extractTextSchema,
} from "../schema/ocr.schema";
import {
  extractMultipleController,
  extractSingleController,
} from "../controllers/ocr.controller";
import {
  checkOcrQuota,
  incrementOcrUsageMiddleware,
} from "../middlewares/check-orc-usage";

const router = Router();

router.post(
  "/extract-text",
  validateBody(extractTextSchema),
  checkOcrQuota,
  extractSingleController,
  incrementOcrUsageMiddleware
);

router.post(
  "/extract-multiple",
  validateBody(extractMultipleTextSchema),
  checkOcrQuota,
  extractMultipleController,
  incrementOcrUsageMiddleware
);

export default router;
