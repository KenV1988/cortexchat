import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { Category, ModelInfo, Tier } from './types.js';

interface RawModelEntry {
  id: string;
  provider: string;
  tier: string;
  context_window: number;
  capabilities: string[];
  local?: boolean;
  cost_per_mtok_in?: number;
  cost_per_mtok_out?: number;
  requires_env?: string;
}

const VALID_TIERS: readonly string[] = ['tiny_local', 'medium_local', 'open_cloud', 'premium', 'moe'];

function assertTier(value: string, modelId: string): Tier {
  if (!VALID_TIERS.includes(value)) {
    throw new Error(`Model "${modelId}" has invalid tier "${value}". Must be one of: ${VALID_TIERS.join(', ')}`);
  }
  return value as Tier;
}

export function parseModelRegistry(yamlText: string): ModelInfo[] {
  const parsed = parse(yamlText) as { models: RawModelEntry[] };
  if (!parsed?.models || !Array.isArray(parsed.models)) {
    throw new Error('Model registry YAML must have a top-level "models" list.');
  }

  return parsed.models.map((entry) => ({
    id: entry.id,
    provider: entry.provider,
    tier: assertTier(entry.tier, entry.id),
    contextWindow: entry.context_window,
    capabilities: entry.capabilities as Category[],
    local: entry.local ?? false,
    costPerMTokIn: entry.cost_per_mtok_in ?? 0,
    costPerMTokOut: entry.cost_per_mtok_out ?? 0,
    ...(entry.requires_env ? { requiresEnv: entry.requires_env } : {}),
  }));
}

export function loadModelRegistry(path: string): ModelInfo[] {
  return parseModelRegistry(readFileSync(path, 'utf-8'));
}
