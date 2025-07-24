import express, { Express } from "express";
import cors from "cors";
import ocrRoutes from "./routes/ocr.routes";

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.use("/api/ocr", ocrRoutes);

  return app;
};
