import { Client } from 'pg';
import { execSync } from 'child_process';

/**
 * Ensures the database and tables exist before Prisma connects.
 * 1. Connects to the default `postgres` DB and creates the target DB if missing.
 * 2. Runs `prisma db push` to sync the schema (creates tables if missing).
 */
export async function ensureDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const parsed = new URL(url);
  const dbName = parsed.pathname.replace('/', '');
  if (!dbName) return;

  // Step 1: Create database if it doesn't exist
  parsed.pathname = '/postgres';
  const client = new Client({ connectionString: parsed.toString() });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    }
  } catch (err) {
    console.warn(`Could not ensure database exists: ${(err as Error).message}`);
    return;
  } finally {
    await client.end();
  }

  // Step 2: Sync schema — use migrate deploy in production, db push in dev
  const cmd = process.env.NODE_ENV === 'production'
    ? 'npx prisma migrate deploy'
    : 'npx prisma db push --skip-generate';
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.warn(`${cmd} failed — tables may need manual sync`);
  }
}
