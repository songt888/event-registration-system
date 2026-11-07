import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Local runs read server/.env; variables already set (for example in CI) win.
if (existsSync('.env')) process.loadEnvFile('.env');

// D-14: unit tests run in parallel; integration files run one at a time against DATABASE_URL_TEST.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          // Unit tests arrive with the first service rules (Issues 4 and 5).
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts'],
          fileParallelism: false,
          globalSetup: ['test/global-setup.ts'],
          setupFiles: ['test/setup-db.ts'],
          testTimeout: 20000,
        },
      },
    ],
  },
});
