import { existsSync, rmSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../client.js';
import { conversations, messages } from '../schema.js';

const TEST_DB_PATH = './data/__test__.sqlite';

describe('db client', () => {
  let ctx: ReturnType<typeof createDb>;

  beforeEach(() => {
    ctx = createDb(TEST_DB_PATH);
    migrate(ctx.db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  });

  afterEach(() => {
    ctx.sqlite.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + suffix;
      if (existsSync(p)) rmSync(p);
    }
  });

  it('inserts and reads back a conversation with messages', async () => {
    const now = Date.now();
    await ctx.db.insert(conversations).values({
      id: 'c1',
      title: 'Test chat',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert(messages).values({
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      content: 'hello',
      createdAt: now,
    });

    const rows = await ctx.db.select().from(messages).where(eq(messages.conversationId, 'c1'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.content).toBe('hello');
  });

  it('cascades message deletion when the parent conversation is deleted', async () => {
    const now = Date.now();
    await ctx.db.insert(conversations).values({ id: 'c2', title: 'x', createdAt: now, updatedAt: now });
    await ctx.db.insert(messages).values({ id: 'm2', conversationId: 'c2', role: 'user', content: 'hi', createdAt: now });

    await ctx.db.delete(conversations).where(eq(conversations.id, 'c2'));

    const remaining = await ctx.db.select().from(messages).where(eq(messages.id, 'm2'));
    expect(remaining).toHaveLength(0);
  });

  it('defaults pinned to false and title to "New chat"', async () => {
    const now = Date.now();
    await ctx.db.insert(conversations).values({ id: 'c3', createdAt: now, updatedAt: now });
    const [row] = await ctx.db.select().from(conversations).where(eq(conversations.id, 'c3'));
    expect(row?.pinned).toBe(false);
    expect(row?.title).toBe('New chat');
  });
});
