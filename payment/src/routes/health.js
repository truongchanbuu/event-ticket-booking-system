import express from 'express';
// import db from '../kafka/db';
// import kafka from '../db/kafka';

const router = express.Router();

router.get('/health', (_, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
  };

  try {
    res.send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).send();
  }
});

router.get('/ready', async (_, res) => {
  try {
    // await db.ping();
    // await kafka.ping();
    // await redis.ping();
    // await authService.ping();
    res.status(200).send('READY');
  } catch (error) {
    res.status(503).send('NOT READY');
  }
});

export default router;
