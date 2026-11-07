import { execSync } from 'node:child_process';

// Resets the E2E database and loads the seed before every run (D-14).
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL_E2E! };
  execSync('npx prisma migrate reset --force --skip-seed', { cwd: 'server', stdio: 'inherit', env });
  execSync('npm run seed', { cwd: 'server', stdio: 'inherit', env });
}
