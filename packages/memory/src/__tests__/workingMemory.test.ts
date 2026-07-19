import { describe, expect, it } from 'vitest';
import { buildWorkingMemory } from '../workingMemory.js';
import type { Message } from '@cortexchat/core';

function msg(role: Message['role'], content: string): Message {
  return { role, content };
}

describe('buildWorkingMemory', () => {
  it('keeps everything when it fits the budget', () => {
    const messages = [msg('user', 'hi'), msg('assistant', 'hello')];
    const result = buildWorkingMemory(messages, 1000);
    expect(result.included).toEqual(messages);
    expect(result.trimmed).toEqual([]);
  });

  it('always preserves the system message even under tight budget', () => {
    const messages = [msg('system', 'be terse'), msg('user', 'a'.repeat(400)), msg('assistant', 'b'.repeat(400))];
    const result = buildWorkingMemory(messages, 50);
    expect(result.included[0]?.role).toBe('system');
  });

  it('trims oldest non-system messages first, keeping the most recent', () => {
    const messages = [msg('user', 'a'.repeat(100)), msg('assistant', 'b'.repeat(100)), msg('user', 'recent')];
    // budget only fits the last message plus a little
    const result = buildWorkingMemory(messages, 10);
    expect(result.included.map((m) => m.content)).toContain('recent');
    expect(result.trimmed.length).toBeGreaterThan(0);
  });

  it('preserves message order in both included and trimmed sets', () => {
    const messages = Array.from({ length: 10 }, (_, i) => msg('user', `msg-${i} ${'x'.repeat(20)}`));
    const result = buildWorkingMemory(messages, 30);
    const includedOrder = result.included.map((m) => m.content);
    const sortedIncluded = [...includedOrder].sort(
      (a, b) => messages.findIndex((m) => m.content === a) - messages.findIndex((m) => m.content === b),
    );
    expect(includedOrder).toEqual(sortedIncluded);
  });
});
