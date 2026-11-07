import express from 'express';

// Builds the app without listening, so tests (Issue 3.3) can use it with Supertest.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return app;
}
