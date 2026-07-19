'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';

/**
 * Responsive shell: permanent sidebar on md+ screens, slide-over drawer with
 * a hamburger header on phones. This is what makes the same codebase
 * genuinely usable installed on Android/iOS home screens, not just desktop.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Navigating (picking a conversation) closes the drawer.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-full">
      <div className="hidden h-full md:block">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <Sidebar />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open conversation list"
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-sm"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">cortexchat</span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
