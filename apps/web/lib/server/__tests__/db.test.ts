import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { conversations } from '@cortexchat/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DB_PATH = path.resolve(__dirname, '../../../data/__web_test__.sqlite');

beforeAll(() => {
  process.env.DATABASE_PATH = TEST_DB_PATH;
  process.env.DB_MIGRATIONS_DIR = path.resolve(__dirname, '../../../../../packages/db/drizzle');
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (existsSync(p)) rmSync(p);
  }
});

describe('lib/server/db', () => {
  it('runs migrations and is queryable on first access', async () => {
    const { getDb } = await import('../db');
    const db = getDb();
    const rows = await db.select().from(conversations);
    expect(rows).toEqual([]);
  });

  it('returns the same singleton instance on repeated calls', async () => {
    const { getDb } = await import('../db');
    expect(getDb()).toBe(getDb());
  });
});
