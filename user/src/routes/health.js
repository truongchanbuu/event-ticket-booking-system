import express from "express";

import { AppError } from "@event_ticket_booking_system/shared";
import ERROR_CODE from "@event_ticket_booking_system/shared/error/error_code.js";
// import container from "../container.js";

const router = express.Router();
// const userService = container.resolve("userService");

router.get("/health", (_, res) => {
    try {
        res.json({
            uptime: process.uptime(),
            message: "ok",
            timestamp: Date.now(),
        });
    } catch (error) {
        throw new AppError({
            message: error ?? "not ok",
            errorCode: ERROR_CODE.INTERNAL_ERROR,
            statusCode: 500,
        });
    }
});

// router.get("/ready", async (_, res) => {
//     try {
//         const [kafkaStatus, firebaseStatus] = await Promise.all([
//             checkKafka(),
//             userService.healthCheck(),
//         ]);

//         const allHealthy =
//             kafkaStatus.status === "connected" &&
//             firebaseStatus.status === "connected";

//         return res.status(allHealthy ? 200 : 503).json({
//             status: allHealthy ? "ok" : "not ok",
//             timestamp: new Date().toISOString(),
//             dependencies: {
//                 kafka: kafkaStatus,
//                 firebase: firebaseStatus,
//             },
//         });
//     } catch (error) {
//         res.status(503).json({
//             code: 503,
//             status: "not ok",
//             timestamp: new Date().toISOString(),
//             error: error.message,
//         });
//     }
// });

export default router;
