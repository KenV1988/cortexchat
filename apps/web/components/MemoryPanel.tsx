'use client';

import { useEffect, useState } from 'react';
import type { MemoryItem, MemoryKind } from '@cortexchat/core';

const KINDS: MemoryKind[] = ['fact', 'preference', 'project', 'goal', 'summary', 'entity_relation'];

export function MemoryPanel() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<MemoryKind>('fact');

  async function refresh() {
    const res = await fetch('/api/memory');
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addItem() {
    if (!content.trim()) return;
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, content }),
    });
    setContent('');
    refresh();
  }

  async function removeItem(id: string) {
    await fetch(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    refresh();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cortexchat-memory-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MemoryKind)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a memory manually (e.g. 'prefers concise answers')"
          className="min-w-64 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
        />
        <button onClick={addItem} className="rounded-md bg-[var(--accent)] px-3 py-1 text-sm text-white">
          Add
        </button>
        <button onClick={exportJson} className="rounded-md border border-[var(--border)] px-3 py-1 text-sm">
          Export JSON
        </button>
      </div>

      {items.length === 0 && <p className="text-sm text-[var(--text-muted)]">No memories stored yet.</p>}

      <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="mr-2 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-xs">{item.kind}</span>
              <span className="truncate">{item.content}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">score {item.score.toFixed(2)}</span>
            </div>
            <button onClick={() => removeItem(item.id)} className="shrink-0 text-xs text-[var(--text-muted)] hover:text-red-500">
              Forget
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
