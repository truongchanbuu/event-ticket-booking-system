import express from "express";
import cors from "cors";
import mediaRouter from "./routes/cloudinary.routes";

const app = express();

if (process.env.NODE_ENV == "development") app.use(cors());

// Add logging middleware
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

app.use(express.json());

app.use("/api/media", mediaRouter);
app.get("/health", (_, res) => res.send("Media service is up"));

export default app;
