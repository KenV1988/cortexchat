import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleAdapter } from '../openai-compatible.js';
import { fakeSSEResponse } from './test-utils.js';

describe('OpenAICompatibleAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports unconfigured when an API key is required but absent', () => {
    const adapter = new OpenAICompatibleAdapter({
      id: 'test',
      baseUrl: 'https://example.invalid/v1',
      requiresApiKey: true,
      getApiKey: () => undefined,
    });
    expect(adapter.isConfigured()).toBe(false);
  });

  it('reports configured when no API key is required (local endpoints)', () => {
    const adapter = new OpenAICompatibleAdapter({
      id: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      requiresApiKey: false,
    });
    expect(adapter.isConfigured()).toBe(true);
  });

  it('streams and concatenates deltas from SSE chat-completion chunks', async () => {
    const chunks = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'lo!' } }] })}`,
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 2 } })}`,
      'data: [DONE]',
    ];
    global.fetch = vi.fn().mockResolvedValue(fakeSSEResponse(chunks));

    const adapter = new OpenAICompatibleAdapter({
      id: 'test',
      baseUrl: 'https://example.invalid/v1',
      requiresApiKey: false,
    });

    let text = '';
    let sawUsage = false;
    for await (const chunk of adapter.chat({ model: 'test-model', messages: [{ role: 'user', content: 'hi' }] })) {
      text += chunk.delta;
      if (chunk.usage) sawUsage = true;
    }

    expect(text).toBe('Hello!');
    expect(sawUsage).toBe(true);
  });

  it('throws with status information on a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('server exploded', { status: 500 }));
    const adapter = new OpenAICompatibleAdapter({
      id: 'test',
      baseUrl: 'https://example.invalid/v1',
      requiresApiKey: false,
    });

    await expect(async () => {
      for await (const _ of adapter.chat({ model: 'x', messages: [] })) {
        // drain
      }
    }).rejects.toThrow(/500/);
  });
});
