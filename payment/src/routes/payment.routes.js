import express from 'express';

export class PaymentRoutes {
  constructor({ paymentController }) {
    this.router = express.Router();
    this.paymentController = paymentController;
    initRoutes();
  }

  initRoutes() {}
}
