'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { ClientMessage } from '../lib/client/types';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';

interface Props {
  conversationId?: string;
  initialMessages?: ClientMessage[];
}

type StreamEvent =
  | { type: 'meta'; routing: { model: string; provider: string; category: string; tier: string; confidence: number; escalated: boolean; reasoning: string[] } }
  | { type: 'delta'; text: string }
  | { type: 'done'; messageId: string; usage?: { promptTokens: number; completionTokens: number } }
  | { type: 'error'; message: string };

const PENDING_ID = '__pending__';

export function ChatWindow({ conversationId, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [reasoning, setReasoning] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const convIdRef = useRef(conversationId);

  async function send(text: string) {
    setError(undefined);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setStreaming(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convIdRef.current, message: text }),
    });

    if (!res.ok || !res.body) {
      setError(`Request failed (${res.status})`);
      setStreaming(false);
      return;
    }

    const newConversationId = res.headers.get('X-Conversation-Id');
    const isNewConversation = !convIdRef.current && newConversationId;
    if (newConversationId) convIdRef.current = newConversationId;

    setMessages((prev) => [...prev, { id: PENDING_ID, role: 'assistant', content: '' }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as StreamEvent;
        applyEvent(event);
      }
    }

    setStreaming(false);
    if (isNewConversation && newConversationId) {
      router.replace(`/c/${newConversationId}`);
    }
  }

  function applyEvent(event: StreamEvent) {
    if (event.type === 'meta') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === PENDING_ID
            ? { ...m, model: event.routing.model, provider: event.routing.provider, category: event.routing.category, tier: event.routing.tier, escalated: event.routing.escalated }
            : m,
        ),
      );
      setReasoning((prev) => ({ ...prev, [PENDING_ID]: event.routing.reasoning }));
    } else if (event.type === 'delta') {
      setMessages((prev) => prev.map((m) => (m.id === PENDING_ID ? { ...m, content: m.content + event.text } : m)));
    } else if (event.type === 'done') {
      setMessages((prev) => prev.map((m) => (m.id === PENDING_ID ? { ...m, id: event.messageId } : m)));
      setReasoning((prev) => {
        const { [PENDING_ID]: r, ...rest } = prev;
        return r ? { ...rest, [event.messageId]: r } : rest;
      });
    } else if (event.type === 'error') {
      setError(event.message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="mt-24 text-center text-[var(--text-muted)]">
              <h1 className="text-2xl font-semibold text-[var(--text)]">cortexchat</h1>
              <p className="mt-2 text-sm">Ask anything. Small stuff runs on a free local model; hard stuff escalates automatically.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} reasoning={reasoning[m.id]} />
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
      <Composer onSend={send} disabled={streaming} />
    </div>
  );
}
