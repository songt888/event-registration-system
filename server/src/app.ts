import express from 'express';
import { authRouter } from './auth/routes.js';
import { errorHandler } from './lib/errors.js';

// Builds the app without listening, so tests can use it with Supertest.
export function createApp() {
  const app = express();
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', authRouter);
  app.use(errorHandler);
  return app;
}
