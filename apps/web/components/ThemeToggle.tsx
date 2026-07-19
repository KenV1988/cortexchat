'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('cortexchat-theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
