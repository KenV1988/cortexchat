import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Point the singleton at the real shipped registry regardless of vitest's cwd.
beforeAll(() => {
  process.env.MODEL_REGISTRY_PATH = path.resolve(__dirname, '../../../../../config/models.yaml');
});

describe('lib/server/providers wiring', () => {
  it('constructs all four built-in adapters', async () => {
    const { getProviders } = await import('../providers');
    const providers = getProviders();
    expect([...providers.keys()].sort()).toEqual(['anthropic', 'ollama', 'openai', 'openrouter']);
  });

  it('loads the real model registry and builds a working router', async () => {
    const { getRouter, getModels } = await import('../providers');
    expect(getModels().length).toBeGreaterThan(0);

    const decision = getRouter().route([{ role: 'user', content: 'hello!' }]);
    expect(decision.category).toBe('greeting');
    expect(decision.model.local).toBe(true); // ollama is always "configured" (best-effort), so tiny_local wins
  });

  it('cheapestConfiguredModel returns the free local tier when nothing else is configured', async () => {
    const { cheapestConfiguredModel } = await import('../providers');
    const model = cheapestConfiguredModel();
    expect(model?.costPerMTokIn).toBe(0);
    expect(model?.costPerMTokOut).toBe(0);
  });
});
