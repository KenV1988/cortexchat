import type { MemoryItem, MemoryStore } from '@cortexchat/core';
import { describe, expect, it, vi } from 'vitest';
import { summarizeAndStore } from '../summarizer.js';

function fakeStore(): MemoryStore & { items: MemoryItem[] } {
  const items: MemoryItem[] = [];
  return {
    items,
    upsert: async (item) => {
      items.push(item);
    },
    search: async () => [],
    searchByKeyword: async () => [],
    all: async () => items,
    remove: async () => {},
    prune: async () => 0,
  };
}

describe('summarizeAndStore', () => {
  it('does nothing when there is nothing trimmed', async () => {
    const store = fakeStore();
    const summarize = vi.fn();
    await summarizeAndStore({ trimmed: [], conversationId: 'c1', store, summarize });
    expect(summarize).not.toHaveBeenCalled();
    expect(store.items).toHaveLength(0);
  });

  it('calls the summarize function and stores the result as a summary MemoryItem', async () => {
    const store = fakeStore();
    const summarize = vi.fn().mockResolvedValue('User discussed their trip to Tallinn and booked flights.');

    await summarizeAndStore({
      trimmed: [
        { role: 'user', content: 'I am planning a trip to Tallinn' },
        { role: 'assistant', content: 'Great, when are you going?' },
      ],
      conversationId: 'c1',
      store,
      summarize,
    });

    expect(summarize).toHaveBeenCalledTimes(1);
    expect(store.items).toHaveLength(1);
    expect(store.items[0]?.kind).toBe('summary');
    expect(store.items[0]?.conversationId).toBe('c1');
    expect(store.items[0]?.content).toContain('Tallinn');
  });

  it('embeds the summary when an embedding provider is supplied', async () => {
    const store = fakeStore();
    const summarize = vi.fn().mockResolvedValue('summary text');
    const embed = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);

    await summarizeAndStore({
      trimmed: [{ role: 'user', content: 'x' }],
      conversationId: 'c1',
      store,
      summarize,
      embeddingProvider: { id: 'fake', dimensions: 3, isConfigured: () => true, embed },
    });

    expect(embed).toHaveBeenCalledWith(['summary text']);
    expect(store.items[0]?.embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
