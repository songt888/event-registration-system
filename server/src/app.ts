import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { authRouter } from './auth/routes.js';
import { eventsRouter } from './events.routes.js';
import { registrationsRouter } from './registrations.routes.js';
import { AppError, errorHandler } from './lib/errors.js';

// Builds the app without listening, so tests can use it with Supertest.
export function createApp() {
  const app = express();
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', authRouter);
  app.use('/api', eventsRouter);
  app.use('/api', registrationsRouter);
  // An unknown API path is a JSON 404, never the UI page (L5-02, AC-52).
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Not found.')));

  // In the image the API also serves the built UI; other paths get index.html so UI routes survive a reload (D-18).
  const dist = process.env.CLIENT_DIST;
  if (dist && existsSync(path.join(dist, 'index.html'))) {
    const index = path.resolve(dist, 'index.html');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(index));
  }
  app.use(errorHandler);
  return app;
}
