// Resolves the integration database and refuses to run against the dev database (D-14).
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('DATABASE_URL_TEST is not set (see .env.example)');
  // Remember the dev URL before setup-db points DATABASE_URL at the test database (files share one process).
  process.env.DEV_DATABASE_URL ??= process.env.DATABASE_URL ?? '';
  if (url === process.env.DEV_DATABASE_URL) {
    throw new Error('DATABASE_URL_TEST must not equal DATABASE_URL: tests never use the dev database');
  }
  return url;
}
