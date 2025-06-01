import express from 'express';
import { scopePerRequest } from 'awilix-express';

import healthRouter from './routes/health.js';
import AppError from '../../shared/error/app_error.js';
import { errorHandler } from '../../shared/error/error_handler.js';
import error_code from '../../shared/error/error_code.js';

export async function createApp() {
  const app = express();

  app.use(express.json());
  app.use(scopePerRequest(container));

  // Apply routes
  // app.use(...)
  app.use('/health', healthRouter);
  app.use((req, res, next) => {
    next(new AppError('Not Found', 404, error_code.NOT_FOUND));
  });

  app.use(errorHandler);

  return app;
}
