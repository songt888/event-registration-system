// Resolves the integration database and refuses to run against the dev database (D-14).
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('DATABASE_URL_TEST is not set (see .env.example)');
  if (url === process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL_TEST must not equal DATABASE_URL: tests never use the dev database');
  }
  return url;
}
