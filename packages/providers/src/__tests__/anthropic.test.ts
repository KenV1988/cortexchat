import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnthropicAdapter } from '../anthropic.js';
import { fakeSSEResponse } from './test-utils.js';

describe('AnthropicAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('is unconfigured without ANTHROPIC_API_KEY', () => {
    const adapter = createAnthropicAdapter({});
    expect(adapter.isConfigured()).toBe(false);
  });

  it('is configured with ANTHROPIC_API_KEY', () => {
    const adapter = createAnthropicAdapter({ ANTHROPIC_API_KEY: 'sk-test' });
    expect(adapter.isConfigured()).toBe(true);
  });

  it('streams text_delta events into chat deltas and surfaces usage on message_delta', async () => {
    const events = [
      `data: ${JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 10 } } })}`,
      `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } })}`,
      `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' there' } })}`,
      `data: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 3 } })}`,
      `data: ${JSON.stringify({ type: 'message_stop' })}`,
    ];
    global.fetch = vi.fn().mockResolvedValue(fakeSSEResponse(events));

    const adapter = createAnthropicAdapter({ ANTHROPIC_API_KEY: 'sk-test' });
    let text = '';
    let usage: { promptTokens: number; completionTokens: number } | undefined;
    for await (const chunk of adapter.chat({ model: 'claude-sonnet-5', messages: [{ role: 'user', content: 'hi' }] })) {
      text += chunk.delta;
      if (chunk.usage) usage = chunk.usage;
    }

    expect(text).toBe('Hi there');
    expect(usage).toEqual({ promptTokens: 10, completionTokens: 3 });
  });

  it('splits system messages out of the messages array', async () => {
    global.fetch = vi.fn().mockResolvedValue(fakeSSEResponse([`data: ${JSON.stringify({ type: 'message_stop' })}`]));
    const adapter = createAnthropicAdapter({ ANTHROPIC_API_KEY: 'sk-test' });

    for await (const _ of adapter.chat({
      model: 'claude-sonnet-5',
      messages: [
        { role: 'system', content: 'You are terse.' },
        { role: 'user', content: 'hi' },
      ],
    })) {
      // drain
    }

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    if (!call) throw new Error('expected fetch to have been called');
    const body = JSON.parse(call[1].body as string);
    expect(body.system).toBe('You are terse.');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('throws when used without an API key', async () => {
    const adapter = createAnthropicAdapter({});
    await expect(async () => {
      for await (const _ of adapter.chat({ model: 'x', messages: [] })) {
        // drain
      }
    }).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
