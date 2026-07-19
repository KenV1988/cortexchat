'use client';

import { useState } from 'react';

interface Props {
  model: string;
  provider: string;
  category?: string | undefined;
  tier?: string | undefined;
  escalated?: boolean | undefined;
  reasoning?: string[] | undefined;
}

const TIER_LABEL: Record<string, string> = {
  tiny_local: 'tiny · local',
  medium_local: 'medium · local',
  open_cloud: 'open cloud',
  premium: 'premium',
  moe: 'mixture-of-experts',
};

export function RoutingBadge({ model, provider, category, tier, escalated, reasoning }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-1 inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <span>
          {model} <span className="opacity-60">({provider})</span>
        </span>
        {tier && <span className="opacity-60">· {TIER_LABEL[tier] ?? tier}</span>}
        {category && <span className="opacity-60">· {category.replace('_', ' ')}</span>}
        {escalated && <span title="Escalated to a more capable tier">↑</span>}
      </button>
      {open && reasoning && reasoning.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-80 rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-xs shadow-lg">
          <p className="mb-1 font-medium">Why this model:</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[var(--text-muted)]">
            {reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
