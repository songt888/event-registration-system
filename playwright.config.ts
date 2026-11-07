import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Local runs read server/.env; variables already set win.
if (existsSync('server/.env')) process.loadEnvFile('server/.env');

const e2eDb = process.env.DATABASE_URL_E2E;
if (!e2eDb) throw new Error('DATABASE_URL_E2E is not set (see .env.example)');
if (e2eDb === process.env.DATABASE_URL) throw new Error('DATABASE_URL_E2E must not equal DATABASE_URL (D-14)');

// D-14: E2E runs on its own database, reset and seeded before each run, never with the integration suite.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev -w server',
      url: 'http://localhost:3000/api/health',
      env: { DATABASE_URL: e2eDb },
      // Fails if a dev server already holds the port, so E2E never talks to the dev database.
      reuseExistingServer: false,
    },
    { command: 'npm run dev -w client', url: 'http://localhost:5173', reuseExistingServer: false },
  ],
});
