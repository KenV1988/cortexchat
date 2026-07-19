import type { ChatParams, Message, ProviderAdapter, StreamChunk } from '@cortexchat/core';
import { readSSE } from './sse.js';

interface OpenAICompatibleConfig {
  id: string;
  baseUrl: string;
  /** Returns the API key, or undefined if not configured. Local endpoints (Ollama) can ignore this. */
  getApiKey?: () => string | undefined;
  /** Extra headers merged into every request (e.g. OpenRouter's attribution headers). */
  extraHeaders?: Record<string, string>;
  /** Whether an API key is required for this adapter to be considered configured. */
  requiresApiKey: boolean;
}

/**
 * Base adapter for any backend that speaks the OpenAI chat-completions
 * wire format: OpenAI itself, Ollama (`/v1/chat/completions`), OpenRouter,
 * and — by construction — any future "OpenAI-compatible endpoint" a user
 * points this at. New compatible providers need zero new code, just a new
 * `OpenAICompatibleAdapter` instance with a different base URL.
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id: string;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.id = config.id;
  }

  isConfigured(): boolean {
    if (!this.config.requiresApiKey) return true;
    return Boolean(this.config.getApiKey?.());
  }

  async discoverModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/models`, { headers: this.headers() });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: Array<{ id: string }> };
      return body.data?.map((m) => m.id) ?? [];
    } catch {
      return [];
    }
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      ...(params.options?.signal ? { signal: params.options.signal } : {}),
      body: JSON.stringify({
        model: params.model,
        messages: toOpenAIMessages(params.messages),
        stream: true,
        ...(params.options?.temperature !== undefined ? { temperature: params.options.temperature } : {}),
        ...(params.options?.maxTokens !== undefined ? { max_tokens: params.options.maxTokens } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${this.id} chat request failed: ${res.status} ${res.statusText} ${body}`);
    }

    for await (const payload of readSSE(res)) {
      if (payload === '[DONE]') {
        yield { delta: '', done: true };
        return;
      }
      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = parsed.choices?.[0];
      const delta = choice?.delta?.content ?? '';
      const finishReason = choice?.finish_reason;
      const mappedFinishReason: 'length' | 'stop' | undefined = finishReason
        ? finishReason === 'length'
          ? 'length'
          : 'stop'
        : undefined;
      yield {
        delta,
        done: Boolean(finishReason),
        ...(mappedFinishReason ? { finishReason: mappedFinishReason } : {}),
        ...(parsed.usage
          ? { usage: { promptTokens: parsed.usage.prompt_tokens ?? 0, completionTokens: parsed.usage.completion_tokens ?? 0 } }
          : {}),
      };
    }
  }

  private headers(): Record<string, string> {
    const key = this.config.getApiKey?.();
    return {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...this.config.extraHeaders,
    };
  }
}

function toOpenAIMessages(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
