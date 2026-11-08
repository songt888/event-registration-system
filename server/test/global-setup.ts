import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './test-db';

// Applies all migrations to the test database once per run.
export default function setup() {
  const url = testDatabaseUrl();
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
