import express from "express";

export class InternalRoutes {
    constructor({ internalController }) {
        this.router = express.Router();
        this.initRoutes();
    }

    initRoutes() {}
}
