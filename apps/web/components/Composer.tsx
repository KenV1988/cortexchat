'use client';

import { useRef, type KeyboardEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = ref.current?.value.trim();
    if (!text || disabled) return;
    onSend(text);
    if (ref.current) ref.current.value = '';
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-[var(--border)] p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
        <textarea
          ref={ref}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message cortexchat…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          disabled={disabled}
        />
        <button
          onClick={submit}
          disabled={disabled}
          className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <p className="mx-auto mt-1 max-w-3xl text-center text-xs text-[var(--text-muted)]">
        cortexchat routes every message to the cheapest capable model automatically.
      </p>
    </div>
  );
}
