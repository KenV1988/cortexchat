import type { ModelInfo, ProviderAdapter } from '@cortexchat/core';
import { createAnthropicAdapter } from './anthropic.js';
import { createOllamaAdapter } from './ollama.js';
import { createOpenAIAdapter } from './openai.js';
import { createOpenRouterAdapter } from './openrouter.js';

/** Builds every built-in adapter, keyed by the `provider` id used in config/models.yaml. */
export function createDefaultProviders(env: NodeJS.ProcessEnv = process.env): Map<string, ProviderAdapter> {
  const adapters = [
    createOllamaAdapter(env),
    createOpenAIAdapter(env),
    createAnthropicAdapter(env),
    createOpenRouterAdapter(env),
  ];
  return new Map(adapters.map((a) => [a.id, a]));
}

/** Builds the Router's `isAvailable` predicate from a set of adapters. */
export function buildIsAvailable(providers: Map<string, ProviderAdapter>): (model: ModelInfo) => boolean {
  return (model: ModelInfo) => providers.get(model.provider)?.isConfigured() ?? false;
}
