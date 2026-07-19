import type { Message } from '@cortexchat/core';

export interface WorkingMemoryResult {
  /** Messages that fit the token budget and should be sent to the model as-is. */
  included: Message[];
  /** Older messages pushed out of the budget; caller should summarize and archive these. */
  trimmed: Message[];
}

function estimateTokens(m: Message): number {
  return Math.ceil(m.content.length / 4);
}

/**
 * Sliding-window working memory: keeps the most recent messages that fit
 * `maxTokens`, always preserving a leading system message if present.
 * Nothing here calls a model — pure, synchronous, and cheap by design so it
 * can run on every single turn without cost.
 */
export function buildWorkingMemory(messages: Message[], maxTokens: number): WorkingMemoryResult {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');

  let budget = maxTokens - systemMessages.reduce((sum, m) => sum + estimateTokens(m), 0);
  const included: Message[] = [];
  const trimmed: Message[] = [];

  for (let i = rest.length - 1; i >= 0; i--) {
    const message = rest[i];
    if (!message) continue;
    const cost = estimateTokens(message);
    if (cost <= budget) {
      included.unshift(message);
      budget -= cost;
    } else {
      trimmed.unshift(message);
    }
  }

  return { included: [...systemMessages, ...included], trimmed };
}
