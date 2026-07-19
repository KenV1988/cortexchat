import { describe, expect, it } from 'vitest';
import { Router } from '../router.js';
import { NoCapableModelError, type Message, type ModelInfo } from '../types.js';

const MODELS: ModelInfo[] = [
  {
    id: 'tiny-local',
    provider: 'ollama',
    tier: 'tiny_local',
    contextWindow: 32768,
    local: true,
    capabilities: ['greeting', 'small_talk', 'simple_question'],
    costPerMTokIn: 0,
    costPerMTokOut: 0,
  },
  {
    id: 'medium-local',
    provider: 'ollama',
    tier: 'medium_local',
    contextWindow: 32768,
    local: true,
    capabilities: ['programming', 'math', 'simple_question'],
    costPerMTokIn: 0,
    costPerMTokOut: 0,
  },
  {
    id: 'open-cloud-cheap',
    provider: 'openrouter',
    tier: 'open_cloud',
    contextWindow: 64000,
    local: false,
    capabilities: ['complex_reasoning', 'research', 'programming', 'long_context'],
    costPerMTokIn: 0.3,
    costPerMTokOut: 1.0,
    requiresEnv: 'OPENROUTER_API_KEY',
  },
  {
    id: 'premium-expensive',
    provider: 'openai',
    tier: 'premium',
    contextWindow: 128000,
    local: false,
    capabilities: ['complex_reasoning', 'research', 'programming', 'multi_agent_task'],
    costPerMTokIn: 5,
    costPerMTokOut: 15,
    requiresEnv: 'OPENAI_API_KEY',
  },
];

function userMsg(content: string): Message[] {
  return [{ role: 'user', content }];
}

describe('Router', () => {
  it('picks the tiny local model for a greeting when everything is available', () => {
    const router = new Router(MODELS, { isAvailable: () => true });
    const decision = router.route(userMsg('hello!'));
    expect(decision.model.id).toBe('tiny-local');
    expect(decision.escalated).toBe(false);
  });

  it('never picks a premium model for a greeting even if only premium is configured', () => {
    // premium doesn't even declare "greeting" capability, so this should throw.
    const router = new Router(MODELS, { isAvailable: (m) => m.id === 'premium-expensive' });
    expect(() => router.route(userMsg('hello!'))).toThrow(NoCapableModelError);
  });

  it('escalates past an unconfigured local tier to the cheapest configured capable model', () => {
    // local models unavailable (e.g. no Ollama running); only cloud tiers configured.
    const router = new Router(MODELS, {
      isAvailable: (m) => m.tier === 'open_cloud' || m.tier === 'premium',
    });
    const decision = router.route(userMsg('fix this ```js\nfunction() {}\n```'));
    expect(decision.model.id).toBe('open-cloud-cheap'); // cheaper of the two configured capable options
    expect(decision.escalated).toBe(true);
  });

  it('prefers the cheapest capable model at the required tier, not just the first match', () => {
    const router = new Router(MODELS, { isAvailable: () => true });
    const decision = router.route(userMsg('I have a null pointer exception in my code, help'));
    expect(decision.model.id).toBe('medium-local'); // programming's min tier, free and capable
  });

  it('routes multi_agent_task straight to premium', () => {
    const router = new Router(MODELS, { isAvailable: () => true });
    const decision = router.route(userMsg('step 1: research this, step 2: write code for it, step 3: test it'));
    expect(decision.model.id).toBe('premium-expensive');
  });

  it('throws NoCapableModelError when no model at all declares the needed capability', () => {
    const router = new Router(MODELS, { isAvailable: () => true });
    expect(() => router.route(userMsg('translate this into french'))).toThrow(NoCapableModelError);
  });

  it('escalates tier when classifier confidence is low', () => {
    // A bare, ambiguous short message defaults to small_talk with confidence 0.4,
    // below the 0.6 escalation threshold, so it should escalate one tier up.
    const router = new Router(MODELS, { isAvailable: () => true });
    const decision = router.route(userMsg('mmk'));
    expect(decision.escalated).toBe(true);
  });
});
