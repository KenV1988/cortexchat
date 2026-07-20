import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { conversations, messages } from '@cortexchat/db';
import type { Message } from '@cortexchat/core';
import { getDb } from '../../../lib/server/db';
import { streamAssistantReply, type ChatStreamEvent } from '../../../lib/server/chatOrchestrator';

export const runtime = 'nodejs';

interface ChatRequestBody {
  conversationId?: string;
  message: string;
}

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + '\n');
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await handleChat(req);
  } catch (err) {
    // Surface the real failure to the UI instead of an opaque 500 — this is
    // a self-hosted, single-user app, so exposing the error detail (and
    // logging it server-side too) is the right tradeoff for debuggability.
    console.error('chat request failed:', err);
    const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    return Response.json({ error: detail }, { status: 500 });
  }
}

async function handleChat(req: Request): Promise<Response> {
  const body = (await req.json()) as ChatRequestBody;
  if (!body.message || typeof body.message !== 'string') {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();
  let conversationId = body.conversationId;

  if (!conversationId) {
    conversationId = randomUUID();
    await db.insert(conversations).values({
      id: conversationId,
      title: body.message.slice(0, 60),
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const existing = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (existing.length === 0) {
      return Response.json({ error: 'conversation not found' }, { status: 404 });
    }
  }

  const userMessageId = randomUUID();
  await db.insert(messages).values({
    id: userMessageId,
    conversationId,
    role: 'user',
    content: body.message,
    createdAt: now,
  });

  const priorRows = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
  const history: Message[] = priorRows
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({ role: r.role as Message['role'], content: r.content }));

  const finalConversationId = conversationId;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamAssistantReply(finalConversationId, history)) {
          controller.enqueue(encodeEvent(event));
        }
      } catch (err) {
        controller.enqueue(encodeEvent({ type: 'error', message: err instanceof Error ? err.message : 'unknown error' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Conversation-Id': conversationId,
    },
  });
}
