import express from "express";
import cors from "cors";
import mediaRouter from "./routes/cloudinary.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/media", mediaRouter);
app.get("/health", (_, res) => res.send("Media service is up"));

export default app;
