import type { ProviderAdapter } from '@cortexchat/core';
import { OpenAICompatibleAdapter } from './openai-compatible.js';

/**
 * Ollama exposes an OpenAI-compatible `/v1/chat/completions` endpoint since
 * v0.1.24+ alongside its native `/api/*` routes. We use the compatible
 * endpoint for chat (one code path shared with every other HTTP provider)
 * but override discovery to hit Ollama's native `/api/tags`, which reports
 * exactly what's been `ollama pull`-ed locally — far more useful for the
 * settings UI than the generic `/models` shape.
 */
export function createOllamaAdapter(env: NodeJS.ProcessEnv = process.env): ProviderAdapter {
  const baseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  const compat = new OpenAICompatibleAdapter({
    id: 'ollama',
    baseUrl: `${baseUrl}/v1`,
    requiresApiKey: false,
  });

  return {
    id: 'ollama',
    isConfigured: () => compat.isConfigured(),
    chat: (params) => compat.chat(params),
    async discoverModels(): Promise<string[]> {
      try {
        const res = await fetch(`${baseUrl}/api/tags`);
        if (!res.ok) return [];
        const body = (await res.json()) as { models?: Array<{ name: string }> };
        return body.models?.map((m) => m.name) ?? [];
      } catch {
        // Ollama not running / unreachable — a completely normal offline state,
        // not an error worth surfacing as one.
        return [];
      }
    },
  };
}
