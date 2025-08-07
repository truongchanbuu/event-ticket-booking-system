import express from 'express';

export class ApiRoutes {
  constructor({ paymentRoutes }) {
    this.router = express.Router();
    this.router.use('/payment', paymentRoutes.router);
  }
}
