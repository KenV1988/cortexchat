import type { MemoryKind } from '@cortexchat/core';

/**
 * Automatic importance scoring for memory pruning (spec: "automatic
 * forgetting of low-value information"). Deliberately simple and
 * deterministic — kind carries most of the signal (a stated preference
 * matters more than a passing summary), content length is a mild
 * tie-breaker for specificity.
 */
const KIND_WEIGHT: Record<MemoryKind, number> = {
  preference: 0.9,
  goal: 0.85,
  project: 0.8,
  fact: 0.7,
  entity_relation: 0.65,
  summary: 0.5,
};

export function scoreMemoryItem(kind: MemoryKind, content: string): number {
  const base = KIND_WEIGHT[kind];
  const specificityBonus = Math.min(content.length / 200, 1) * 0.1;
  return Math.min(base + specificityBonus, 1);
}

/**
 * Recency-decayed score used at read time: a memory's stored `score` decays
 * toward zero the longer it goes unaccessed, so `prune()` naturally forgets
 * things nobody has touched in a long time even if their base importance
 * was once high.
 */
export function decayedScore(baseScore: number, lastAccessedAt: number, now: number): number {
  const daysSinceAccess = (now - lastAccessedAt) / (1000 * 60 * 60 * 24);
  const HALF_LIFE_DAYS = 90;
  const decay = Math.pow(0.5, daysSinceAccess / HALF_LIFE_DAYS);
  return baseScore * decay;
}
