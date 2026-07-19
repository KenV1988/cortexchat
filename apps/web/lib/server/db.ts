import 'server-only';
import path from 'node:path';
import { createDb, type Db } from '@cortexchat/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

let cached: { db: Db } | undefined;

// Deliberately NOT `new URL('...', import.meta.url)` — webpack (which bundles
// Next's server routes) treats that exact pattern as a static asset
// reference and tries to resolve it at build time, which breaks here since
// this points at a directory of .sql files, not a bundlable module. Node's
// process.cwd() is stable and correct for both `next dev`/`next start`
// (invoked from apps/web) and Docker (which sets DB_MIGRATIONS_DIR explicitly).
function migrationsFolder(): string {
  return process.env.DB_MIGRATIONS_DIR ?? path.resolve(process.cwd(), '../../packages/db/drizzle');
}

/**
 * Process-wide singleton DB connection. Migrations run once at first
 * access so `next dev` / a fresh container start always boots against an
 * up-to-date schema with zero manual steps.
 */
export function getDb(): Db {
  if (cached) return cached.db;

  const dbPath = process.env.DATABASE_PATH ?? './data/cortexchat.sqlite';
  const { db } = createDb(dbPath);
  migrate(db, { migrationsFolder: migrationsFolder() });

  cached = { db };
  return db;
}
