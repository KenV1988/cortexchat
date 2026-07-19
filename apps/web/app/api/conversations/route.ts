import { randomUUID } from 'node:crypto';
import { desc } from 'drizzle-orm';
import { conversations } from '@cortexchat/db';
import { getDb } from '../../../lib/server/db';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const db = getDb();
  const rows = await db.select().from(conversations).orderBy(desc(conversations.pinned), desc(conversations.updatedAt));
  return Response.json(rows);
}

export async function POST(): Promise<Response> {
  const db = getDb();
  const now = Date.now();
  const id = randomUUID();
  await db.insert(conversations).values({ id, title: 'New chat', createdAt: now, updatedAt: now });
  return Response.json({ id }, { status: 201 });
}
