import { eq } from 'drizzle-orm';
import { conversations, messages } from '@cortexchat/db';
import { getDb } from '../../../../lib/server/db';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const db = getDb();

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conversation) return Response.json({ error: 'not found' }, { status: 404 });

  const rows = await db.select().from(messages).where(eq(messages.conversationId, id));
  const sorted = rows.sort((a, b) => a.createdAt - b.createdAt);

  return Response.json({ conversation, messages: sorted });
}

interface PatchBody {
  title?: string;
  pinned?: boolean;
  folderId?: string | null;
}

export async function PATCH(req: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const body = (await req.json()) as PatchBody;
  const db = getDb();

  const update: Partial<typeof conversations.$inferInsert> = { updatedAt: Date.now() };
  if (body.title !== undefined) update.title = body.title;
  if (body.pinned !== undefined) update.pinned = body.pinned;
  if (body.folderId !== undefined) update.folderId = body.folderId;

  await db.update(conversations).set(update).where(eq(conversations.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const db = getDb();
  await db.delete(conversations).where(eq(conversations.id, id));
  return Response.json({ ok: true });
}
