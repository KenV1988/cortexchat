import 'server-only';
import type { ChatParams, ProviderAdapter } from '@cortexchat/core';

/** Drains a streaming chat call into a single string. Used for internal, non-user-facing calls like summarization. */
export async function collectChat(adapter: ProviderAdapter, params: ChatParams): Promise<string> {
  let text = '';
  for await (const chunk of adapter.chat(params)) {
    text += chunk.delta;
  }
  return text;
}
