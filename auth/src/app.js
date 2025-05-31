import express from 'express';

export async function createApp() {
  const app = express();

  app.use(express.json());

  // Apply routes

  return app;
}
