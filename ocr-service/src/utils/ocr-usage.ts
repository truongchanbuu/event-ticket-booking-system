import fs from "fs";
import path from "path";
import { LIMIT_IMAGES } from "../config/constants";

const usagePath = path.join(__dirname, "../../ocr-usage.json");

export function getUsage(): number {
  if (!fs.existsSync(usagePath)) return 0;
  const data = JSON.parse(fs.readFileSync(usagePath, "utf-8"));
  return data.used || 0;
}

export function incrementUsage(): number {
  const current = getUsage();
  const updated = current + 1;
  fs.writeFileSync(usagePath, JSON.stringify({ used: updated }, null, 2));
  return updated;
}

export function isLimitExceeded(): boolean {
  return getUsage() >= LIMIT_IMAGES;
}
