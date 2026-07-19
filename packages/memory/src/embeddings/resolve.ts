import type { EmbeddingProvider } from '@cortexchat/core';
import { createOllamaEmbeddingProvider } from './ollama.js';
import { createOpenAIEmbeddingProvider } from './openai.js';

export interface EmbeddingResolution {
  provider: EmbeddingProvider | undefined;
  reason: string;
}

/**
 * Resolves which embedding backend semantic memory should use, in the
 * local-first order the project's whole design favors: try Ollama first
 * (free, private, offline), fall back to OpenAI if a key is present,
 * otherwise degrade gracefully — semantic memory simply stays disabled and
 * the memory store transparently falls back to keyword search instead of
 * silently returning wrong/fake results.
 */
export async function resolveEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): Promise<EmbeddingResolution> {
  const forced = env.EMBEDDING_PROVIDER;

  if (forced === 'openai') {
    const openai = createOpenAIEmbeddingProvider(env);
    return openai.isConfigured()
      ? { provider: openai, reason: 'EMBEDDING_PROVIDER=openai' }
      : { provider: undefined, reason: 'EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set' };
  }

  if (forced === 'ollama') {
    const ollama = createOllamaEmbeddingProvider(env);
    const reachable = await probeOllama(ollama);
    return reachable
      ? { provider: ollama, reason: 'EMBEDDING_PROVIDER=ollama' }
      : { provider: undefined, reason: 'EMBEDDING_PROVIDER=ollama but Ollama is unreachable' };
  }

  if (forced === 'none') {
    return { provider: undefined, reason: 'EMBEDDING_PROVIDER=none' };
  }

  // auto: prefer local Ollama, then OpenAI, then degrade.
  const ollama = createOllamaEmbeddingProvider(env);
  if (await probeOllama(ollama)) {
    return { provider: ollama, reason: 'auto-selected Ollama (local, free)' };
  }

  const openai = createOpenAIEmbeddingProvider(env);
  if (openai.isConfigured()) {
    return { provider: openai, reason: 'auto-selected OpenAI (Ollama unreachable, OPENAI_API_KEY present)' };
  }

  return {
    provider: undefined,
    reason: 'no embedding backend available (Ollama unreachable, no OPENAI_API_KEY) — semantic memory running in degraded keyword-only mode',
  };
}

async function probeOllama(provider: EmbeddingProvider): Promise<boolean> {
  try {
    await provider.embed(['ping']);
    return true;
  } catch {
    return false;
  }
}
