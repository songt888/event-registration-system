import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Issue 10.1 (#41): demo screenshots (Part F2) and the NFR-09 rerun on the release.
// Run from the repo root: npx playwright test -c docs/evidence/release/capture.config.ts
// Same database rules as playwright.config.ts (D-14): own E2E database, reset and seeded first.
if (existsSync('server/.env')) process.loadEnvFile('server/.env');

const e2eDb = process.env.DATABASE_URL_E2E;
if (!e2eDb) throw new Error('DATABASE_URL_E2E is not set (see .env.example)');
if (e2eDb === process.env.DATABASE_URL) throw new Error('DATABASE_URL_E2E must not equal DATABASE_URL (D-14)');

export default defineConfig({
  testDir: '.',
  globalSetup: '../../../e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce', // stable screenshots; the app removes all motion under this setting (D-15)
  },
  webServer: [
    {
      command: 'npm run dev -w server',
      cwd: '../../..',
      url: 'http://localhost:3000/api/health',
      env: { DATABASE_URL: e2eDb },
      reuseExistingServer: false,
    },
    { command: 'npm run dev -w client', cwd: '../../..', url: 'http://localhost:5173', reuseExistingServer: false },
  ],
});
