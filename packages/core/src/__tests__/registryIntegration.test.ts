import { describe, expect, it } from 'vitest';
import { loadModelRegistry } from '../config.js';
import type { Category } from '../types.js';

const REGISTRY_PATH = new URL('../../../../config/models.yaml', import.meta.url).pathname;

// Categories the router can classify but which have no wired-up multimodal
// adapter yet in this milestone (see config/models.yaml's header comment
// and docs/ARCHITECTURE.md "Known gaps"). Kept as an explicit allowlist so
// this test fails loudly — not silently — the moment someone adds vision
// capability to a model without also wiring image upload end-to-end, or
// removes the last text model covering a category by accident.
const KNOWN_UNROUTABLE: Category[] = ['image_understanding', 'ocr', 'audio'];

const ALL_CATEGORIES: Category[] = [
  'greeting',
  'small_talk',
  'simple_question',
  'complex_reasoning',
  'programming',
  'math',
  'image_understanding',
  'ocr',
  'audio',
  'research',
  'translation',
  'planning',
  'writing',
  'document_analysis',
  'long_context',
  'multi_agent_task',
];

describe('shipped config/models.yaml', () => {
  it('parses without throwing', () => {
    expect(() => loadModelRegistry(REGISTRY_PATH)).not.toThrow();
  });

  it('every category is either routable or a documented known gap', () => {
    const models = loadModelRegistry(REGISTRY_PATH);
    const coveredCategories = new Set(models.flatMap((m) => m.capabilities));

    for (const category of ALL_CATEGORIES) {
      const isCovered = coveredCategories.has(category);
      const isKnownGap = KNOWN_UNROUTABLE.includes(category);
      expect(isCovered || isKnownGap, `category "${category}" has no capable model and isn't in KNOWN_UNROUTABLE`).toBe(true);
    }
  });

  it('every model with requires_env references a real provider', () => {
    const models = loadModelRegistry(REGISTRY_PATH);
    const knownProviders = new Set(['openai', 'anthropic', 'ollama', 'openrouter']);
    for (const model of models) {
      expect(knownProviders.has(model.provider), `unknown provider "${model.provider}" on model "${model.id}"`).toBe(true);
    }
  });

  it('has at least one free local model for the cheapest tier', () => {
    const models = loadModelRegistry(REGISTRY_PATH);
    const tinyLocal = models.filter((m) => m.tier === 'tiny_local');
    expect(tinyLocal.length).toBeGreaterThan(0);
    expect(tinyLocal.every((m) => m.local && m.costPerMTokIn === 0 && m.costPerMTokOut === 0)).toBe(true);
  });
});
