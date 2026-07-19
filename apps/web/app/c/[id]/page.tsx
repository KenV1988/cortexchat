import { eq } from 'drizzle-orm';
import { conversations, messages } from '@cortexchat/db';
import { notFound } from 'next/navigation';
import { ChatWindow } from '../../../components/ChatWindow';
import { getDb } from '../../../lib/server/db';
import type { ClientMessage } from '../../../lib/client/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conversation) notFound();

  const rows = await db.select().from(messages).where(eq(messages.conversationId, id));
  const initialMessages: ClientMessage[] = rows
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({
      id: r.id,
      role: r.role as ClientMessage['role'],
      content: r.content,
      ...(r.model ? { model: r.model } : {}),
      ...(r.provider ? { provider: r.provider } : {}),
      ...(r.category ? { category: r.category } : {}),
      ...(r.tier ? { tier: r.tier } : {}),
      ...(r.escalated !== null ? { escalated: r.escalated } : {}),
    }));

  return <ChatWindow conversationId={id} initialMessages={initialMessages} />;
}
