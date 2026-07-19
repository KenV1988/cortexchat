'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../lib/client/types';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  async function refresh() {
    const res = await fetch('/api/conversations');
    if (res.ok) setConversations(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [pathname]);

  async function togglePin(c: ConversationSummary, e: React.MouseEvent) {
    e.preventDefault();
    await fetch(`/api/conversations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    refresh();
  }

  async function remove(c: ConversationSummary, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${c.title}"?`)) return;
    await fetch(`/api/conversations/${c.id}`, { method: 'DELETE' });
    if (pathname === `/c/${c.id}`) router.push('/');
    refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)] p-2">
      <Link
        href="/"
        className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--bg)]"
      >
        + New chat
      </Link>

      <nav className="flex-1 overflow-y-auto">
        {loading && <p className="px-2 py-4 text-sm text-[var(--text-muted)]">Loading…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-[var(--text-muted)]">No conversations yet.</p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.id}`}
                className={`group flex items-center justify-between gap-1 rounded-md px-2 py-2 text-sm hover:bg-[var(--bg)] ${
                  pathname === `/c/${c.id}` ? 'bg-[var(--bg)] font-medium' : ''
                }`}
              >
                <span className="truncate">
                  {c.pinned ? '★ ' : ''}
                  {c.title || 'New chat'}
                </span>
                <span className="hidden shrink-0 gap-1 group-hover:flex">
                  <button
                    onClick={(e) => togglePin(c, e)}
                    className="rounded px-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    title={c.pinned ? 'Unpin' : 'Pin'}
                  >
                    {c.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={(e) => remove(c, e)}
                    className="rounded px-1 text-xs text-[var(--text-muted)] hover:text-red-500"
                    title="Delete"
                  >
                    Del
                  </button>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
        <Link href="/settings" className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]">
          Settings
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
