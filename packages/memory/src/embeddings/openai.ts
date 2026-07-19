import type { EmbeddingProvider } from '@cortexchat/core';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

export function createOpenAIEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): EmbeddingProvider {
  return {
    id: 'openai',
    dimensions: DIMENSIONS,
    isConfigured: () => Boolean(env.OPENAI_API_KEY),
    async embed(texts: string[]): Promise<number[][]> {
      const key = env.OPENAI_API_KEY;
      if (!key) throw new Error('openai embedding provider used without OPENAI_API_KEY configured');

      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, input: texts }),
      });
      if (!res.ok) {
        throw new Error(`openai embeddings request failed: ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
      return body.data.map((d) => d.embedding);
    },
  };
}
