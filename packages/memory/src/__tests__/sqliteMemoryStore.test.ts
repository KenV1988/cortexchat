import { existsSync, rmSync } from 'node:fs';
import { createDb } from '@cortexchat/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteMemoryStore } from '../sqliteMemoryStore.js';

const TEST_DB_PATH = './data/__memory_test__.sqlite';

describe('SqliteMemoryStore', () => {
  let ctx: ReturnType<typeof createDb>;
  let store: SqliteMemoryStore;

  beforeEach(() => {
    ctx = createDb(TEST_DB_PATH);
    migrate(ctx.db, { migrationsFolder: new URL('../../../db/drizzle', import.meta.url).pathname });
    store = new SqliteMemoryStore(ctx.db);
  });

  afterEach(() => {
    ctx.sqlite.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + suffix;
      if (existsSync(p)) rmSync(p);
    }
  });

  it('round-trips an item without an embedding (degraded mode)', async () => {
    const now = Date.now();
    await store.upsert({ id: 'm1', kind: 'fact', content: 'user lives in Tallinn', createdAt: now, lastAccessedAt: now, score: 0.7 });
    const all = await store.all();
    expect(all).toHaveLength(1);
    expect(all[0]?.embedding).toBeUndefined();
  });

  it('finds items by keyword when no embedding is present', async () => {
    const now = Date.now();
    await store.upsert({ id: 'm1', kind: 'fact', content: 'user prefers dark mode', createdAt: now, lastAccessedAt: now, score: 0.7 });
    await store.upsert({ id: 'm2', kind: 'fact', content: 'user drinks coffee', createdAt: now, lastAccessedAt: now, score: 0.7 });

    const results = await store.searchByKeyword('dark mode', 10);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('m1');
  });

  it('ranks semantic search results by cosine similarity', async () => {
    const now = Date.now();
    await store.upsert({ id: 'close', kind: 'fact', content: 'a', embedding: [1, 0, 0], createdAt: now, lastAccessedAt: now, score: 0.7 });
    await store.upsert({ id: 'far', kind: 'fact', content: 'b', embedding: [0, 1, 0], createdAt: now, lastAccessedAt: now, score: 0.7 });

    const results = await store.search([1, 0, 0], 2);
    expect(results[0]?.id).toBe('close');
    expect(results[1]?.id).toBe('far');
  });

  it('prunes items whose decayed score falls below the threshold', async () => {
    const longAgo = Date.now() - 400 * 24 * 60 * 60 * 1000; // well past several half-lives
    const now = Date.now();
    await store.upsert({ id: 'stale', kind: 'summary', content: 'old chat', createdAt: longAgo, lastAccessedAt: longAgo, score: 0.5 });
    await store.upsert({ id: 'fresh', kind: 'preference', content: 'likes dark mode', createdAt: now, lastAccessedAt: now, score: 0.9 });

    const removed = await store.prune(0.1);
    expect(removed).toBe(1);
    const remaining = await store.all();
    expect(remaining.map((i) => i.id)).toEqual(['fresh']);
  });

  it('upsert overwrites content and score for an existing id', async () => {
    const now = Date.now();
    await store.upsert({ id: 'm1', kind: 'fact', content: 'v1', createdAt: now, lastAccessedAt: now, score: 0.5 });
    await store.upsert({ id: 'm1', kind: 'fact', content: 'v2', createdAt: now, lastAccessedAt: now, score: 0.9 });

    const all = await store.all();
    expect(all).toHaveLength(1);
    expect(all[0]?.content).toBe('v2');
    expect(all[0]?.score).toBe(0.9);
  });
});
