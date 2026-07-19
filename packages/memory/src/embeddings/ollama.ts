import type { EmbeddingProvider } from '@cortexchat/core';

const DEFAULT_MODEL = 'nomic-embed-text';
const DIMENSIONS = 768;

/** Local, free, private embeddings via Ollama's batched `/api/embed` endpoint. */
export function createOllamaEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): EmbeddingProvider {
  const baseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  const model = env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_MODEL;

  return {
    id: 'ollama',
    dimensions: DIMENSIONS,
    isConfigured: () => true, // best-effort; actual reachability is probed by resolveEmbeddingProvider()
    async embed(texts: string[]): Promise<number[][]> {
      const res = await fetch(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts }),
      });
      if (!res.ok) {
        throw new Error(`ollama embeddings request failed: ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { embeddings?: number[][] };
      if (!body.embeddings) throw new Error('ollama embeddings response missing "embeddings" field');
      return body.embeddings;
    },
  };
}
