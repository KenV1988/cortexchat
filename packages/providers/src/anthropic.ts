import type { ChatParams, Message, ProviderAdapter, StreamChunk } from '@cortexchat/core';
import { readSSE } from './sse.js';

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Anthropic's Messages API uses a distinct wire format from the OpenAI
 * family (separate `system` field, `content_block_delta` SSE events), so
 * unlike ollama/openrouter it cannot share OpenAICompatibleAdapter and gets
 * its own small, self-contained implementation of the same ProviderAdapter
 * contract.
 */
export function createAnthropicAdapter(env: NodeJS.ProcessEnv = process.env): ProviderAdapter {
  const getApiKey = () => env.ANTHROPIC_API_KEY;

  return {
    id: 'anthropic',
    isConfigured: () => Boolean(getApiKey()),

    async discoverModels(): Promise<string[]> {
      const key = getApiKey();
      if (!key) return [];
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION },
        });
        if (!res.ok) return [];
        const body = (await res.json()) as { data?: Array<{ id: string }> };
        return body.data?.map((m) => m.id) ?? [];
      } catch {
        return [];
      }
    },

    async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
      const key = getApiKey();
      if (!key) throw new Error('anthropic adapter used without ANTHROPIC_API_KEY configured');

      const { system, messages } = splitSystem(params.messages);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        ...(params.options?.signal ? { signal: params.options.signal } : {}),
        headers: {
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          ...(system ? { system } : {}),
          messages,
          stream: true,
          max_tokens: params.options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(params.options?.temperature !== undefined ? { temperature: params.options.temperature } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`anthropic chat request failed: ${res.status} ${res.statusText} ${body}`);
      }

      let promptTokens = 0;
      for await (const payload of readSSE(res)) {
        const event = JSON.parse(payload) as AnthropicStreamEvent;

        if (event.type === 'message_start') {
          promptTokens = event.message?.usage?.input_tokens ?? 0;
        } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield { delta: event.delta.text ?? '', done: false };
        } else if (event.type === 'message_delta') {
          yield {
            delta: '',
            done: true,
            finishReason: event.delta?.stop_reason === 'max_tokens' ? 'length' : 'stop',
            usage: {
              promptTokens,
              completionTokens: event.usage?.output_tokens ?? 0,
            },
          };
        } else if (event.type === 'message_stop') {
          return;
        } else if (event.type === 'error') {
          // Anthropic reports mid-stream failures (overloaded_error, etc.) as
          // an SSE event, not an HTTP status — surface it instead of letting
          // the stream end looking like an empty success.
          throw new Error(`anthropic stream error: ${event.error?.type ?? 'unknown'}: ${event.error?.message ?? ''}`);
        }
      }
    },
  };
}

interface AnthropicStreamEvent {
  type: string;
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: { output_tokens?: number };
  error?: { type?: string; message?: string };
}

function splitSystem(messages: Message[]): { system: string | undefined; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const systemParts: string[] = [];
  const rest: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
    } else if (m.role === 'user' || m.role === 'assistant') {
      rest.push({ role: m.role, content: m.content });
    }
    // 'tool' role messages are out of scope for this milestone (no tool-calling wired up yet).
  }

  return { system: systemParts.length ? systemParts.join('\n\n') : undefined, messages: rest };
}
