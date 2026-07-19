import type { EmbeddingProvider, Message, MemoryStore } from '@cortexchat/core';
import { scoreMemoryItem } from './scoring.js';

export interface SummarizeAndStoreParams {
  trimmed: Message[];
  conversationId: string;
  store: MemoryStore;
  /** Caller-supplied chat function, typically the cheapest configured model — summarization is deliberately routed to minimize cost. */
  summarize: (messages: Message[]) => Promise<string>;
  embeddingProvider?: EmbeddingProvider;
}

/**
 * Turns messages pushed out of the working-memory window into a durable
 * summary MemoryItem, so context is compressed rather than lost. Only runs
 * when there's actually something to summarize (empty `trimmed` is a no-op)
 * so it never spends a model call for nothing.
 */
export async function summarizeAndStore(params: SummarizeAndStoreParams): Promise<void> {
  if (params.trimmed.length === 0) return;

  const transcript = params.trimmed.map((m) => `${m.role}: ${m.content}`).join('\n');
  const prompt: Message[] = [
    {
      role: 'system',
      content:
        'Summarize the following conversation excerpt in 2-4 sentences, preserving concrete facts, decisions, and action items. Do not add commentary.',
    },
    { role: 'user', content: transcript },
  ];

  const summary = await params.summarize(prompt);
  const now = Date.now();

  const embedding = params.embeddingProvider ? (await params.embeddingProvider.embed([summary]))[0] : undefined;

  // Deterministic id: one evolving summary row per conversation. Each turn's
  // `trimmed` set is recomputed from the full history, so the regenerated
  // summary always covers everything currently outside the window — a fresh
  // row per turn would just accumulate near-duplicates of it.
  await params.store.upsert({
    id: `summary:${params.conversationId}`,
    kind: 'summary',
    content: summary,
    ...(embedding ? { embedding } : {}),
    createdAt: now,
    lastAccessedAt: now,
    score: scoreMemoryItem('summary', summary),
    conversationId: params.conversationId,
  });
}
