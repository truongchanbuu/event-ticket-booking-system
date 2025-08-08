import express from "express";

export class ApiRoutes {
    constructor({ profileRoutes }) {
        this.router = express.Router();
        this.router.use("/me/payment", profileRoutes.router);
    }
}
