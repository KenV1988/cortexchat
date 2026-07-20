import path from 'node:path';
import { NoCapableModelError, Router } from '@cortexchat/core';
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

  it('routes a greeting to a tiny local model when Ollama reports it pulled', async () => {
    const { getModels, isAvailableWith } = await import('../providers');
    const router = new Router(getModels(), {
      isAvailable: isAvailableWith({ reachable: true, pulled: new Set(['qwen2.5:0.5b']) }),
    });
    const decision = router.route([{ role: 'user', content: 'hello!' }]);
    expect(decision.model.id).toBe('qwen2.5:0.5b');
    expect(decision.model.local).toBe(true);
  });

  it('local models are unavailable when Ollama is unreachable, so an unprovisioned install cannot route a greeting', async () => {
    // In the test environment there is no Ollama daemon and no cloud keys —
    // routing must fail loudly (typed error) instead of picking a model that
    // cannot actually answer.
    const { getRouter } = await import('../providers');
    const router = await getRouter();
    expect(() => router.route([{ role: 'user', content: 'hello!' }])).toThrow(NoCapableModelError);
  });

  it('cheapestAvailableModel returns undefined when nothing can actually answer', async () => {
    const { cheapestAvailableModel } = await import('../providers');
    expect(await cheapestAvailableModel()).toBeUndefined();
  });
});
