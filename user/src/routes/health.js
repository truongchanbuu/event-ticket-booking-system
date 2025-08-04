import express from "express";

const router = express.Router();

router.get("/", (_, res) => {
    res.json({
        uptime: process.uptime(),
        message: "ok",
        timestamp: Date.now(),
    });
});

export default router;
