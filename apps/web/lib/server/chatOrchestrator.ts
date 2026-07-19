import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Message, RoutingDecision } from '@cortexchat/core';
import { buildWorkingMemory, summarizeAndStore } from '@cortexchat/memory';
import { messages as messagesTable, conversations as conversationsTable } from '@cortexchat/db';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { cheapestConfiguredModel, getProviderFor, getRouter } from './providers';
import { getEmbeddingResolution, getMemoryStore } from './memory';
import { collectChat } from './collect';

export type ChatStreamEvent =
  | { type: 'meta'; routing: { model: string; provider: string; category: string; tier: string; confidence: number; escalated: boolean; reasoning: string[] } }
  | { type: 'delta'; text: string }
  | { type: 'done'; messageId: string; usage?: { promptTokens: number; completionTokens: number } }
  | { type: 'error'; message: string };

const SYSTEM_PROMPT: Message = {
  role: 'system',
  content:
    'You are cortexchat, an open-source, local-first AI assistant. Be direct and helpful. If you are unsure of something time-sensitive, say so instead of guessing.',
};

const MAX_WORKING_MEMORY_TOKENS = 32_000;
const RESPONSE_TOKEN_RESERVE = 2_000;
const MEMORY_RESULTS_LIMIT = 5;

async function buildMemoryContextMessage(latestUserContent: string, conversationId: string): Promise<Message | undefined> {
  const store = getMemoryStore();
  const { provider: embeddingProvider } = await getEmbeddingResolution();

  const results = embeddingProvider
    ? await store.search((await embeddingProvider.embed([latestUserContent]))[0] ?? [], MEMORY_RESULTS_LIMIT)
    : await store.searchByKeyword(latestUserContent, MEMORY_RESULTS_LIMIT);

  const relevant = results.filter((r) => r.conversationId !== conversationId || r.kind !== 'summary');
  if (relevant.length === 0) return undefined;

  return {
    role: 'system',
    content: `Relevant memory from prior interactions:\n${relevant.map((r) => `- (${r.kind}) ${r.content}`).join('\n')}`,
  };
}

/**
 * Orchestrates one assistant turn end-to-end: routes the request, assembles
 * working memory + relevant long-term memory, streams the model's reply,
 * persists it, and archives anything trimmed out of the context window.
 * This is the one place all of cortexchat's subsystems (router, memory,
 * providers, db) actually compose.
 */
export async function* streamAssistantReply(conversationId: string, history: Message[]): AsyncGenerator<ChatStreamEvent> {
  const router = getRouter();

  let routing: RoutingDecision;
  try {
    routing = router.route(history);
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'routing failed' };
    return;
  }

  yield {
    type: 'meta',
    routing: {
      model: routing.model.id,
      provider: routing.model.provider,
      category: routing.category,
      tier: routing.tier,
      confidence: routing.confidence,
      escalated: routing.escalated,
      reasoning: routing.reasoning,
    },
  };

  const budget = Math.min(routing.model.contextWindow * 0.5, MAX_WORKING_MEMORY_TOKENS) - RESPONSE_TOKEN_RESERVE;
  const working = buildWorkingMemory(history, Math.max(budget, 1000));

  const latestUser = [...history].reverse().find((m) => m.role === 'user');
  const memoryMessage = latestUser ? await buildMemoryContextMessage(latestUser.content, conversationId) : undefined;

  const finalMessages: Message[] = [SYSTEM_PROMPT, ...(memoryMessage ? [memoryMessage] : []), ...working.included];

  const adapter = getProviderFor(routing.model);
  let fullText = '';
  let usage: { promptTokens: number; completionTokens: number } | undefined;

  try {
    for await (const chunk of adapter.chat({ model: routing.model.id, messages: finalMessages })) {
      if (chunk.delta) {
        fullText += chunk.delta;
        yield { type: 'delta', text: chunk.delta };
      }
      if (chunk.usage) usage = chunk.usage;
    }
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'chat request failed' };
    return;
  }

  const messageId = randomUUID();
  const now = Date.now();
  const db = getDb();

  await db.insert(messagesTable).values({
    id: messageId,
    conversationId,
    role: 'assistant',
    content: fullText,
    model: routing.model.id,
    provider: routing.model.provider,
    category: routing.category,
    tier: routing.tier,
    escalated: routing.escalated,
    createdAt: now,
  });
  await db.update(conversationsTable).set({ updatedAt: now }).where(eq(conversationsTable.id, conversationId));

  yield { type: 'done', messageId, ...(usage ? { usage } : {}) };

  if (working.trimmed.length > 0) {
    const summarizerModel = cheapestConfiguredModel();
    if (summarizerModel) {
      const summarizerAdapter = getProviderFor(summarizerModel);
      const { provider: embeddingProvider } = await getEmbeddingResolution();
      // Intentionally not awaited by the caller of this generator — summarization
      // shouldn't hold up the response the user is already reading — but we do
      // await it here so the generator's own lifetime covers it (no dangling
      // work after the request handler returns, which some runtimes kill).
      await summarizeAndStore({
        trimmed: working.trimmed,
        conversationId,
        store: getMemoryStore(),
        summarize: (msgs) => collectChat(summarizerAdapter, { model: summarizerModel.id, messages: msgs }),
        ...(embeddingProvider ? { embeddingProvider } : {}),
      }).catch(() => {
        // Best-effort: a failed summarization must never break the chat turn that already succeeded.
      });
    }
  }
}
