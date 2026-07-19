import 'server-only';
import path from 'node:path';
import { createDefaultProviders, buildIsAvailable } from '@cortexchat/providers';
import { loadModelRegistry, Router, type ModelInfo } from '@cortexchat/core';
import type { ProviderAdapter } from '@cortexchat/core';

let cached:
  | {
      providers: Map<string, ProviderAdapter>;
      models: ModelInfo[];
      router: Router;
    }
  | undefined;

// See db.ts for why this avoids `new URL(literal, import.meta.url)`.
function modelRegistryPath(): string {
  return process.env.MODEL_REGISTRY_PATH ?? path.resolve(process.cwd(), '../../config/models.yaml');
}

function context() {
  if (cached) return cached;

  const providers = createDefaultProviders(process.env);
  const models = loadModelRegistry(modelRegistryPath());
  const router = new Router(models, { isAvailable: buildIsAvailable(providers) });

  cached = { providers, models, router };
  return cached;
}

export function getProviders(): Map<string, ProviderAdapter> {
  return context().providers;
}

export function getModels(): ModelInfo[] {
  return context().models;
}

export function getRouter(): Router {
  return context().router;
}

export function getProviderFor(model: ModelInfo): ProviderAdapter {
  const adapter = getProviders().get(model.provider);
  if (!adapter) throw new Error(`No adapter registered for provider "${model.provider}"`);
  return adapter;
}

/** The cheapest configured model overall, used to route low-stakes internal work like summarization. */
export function cheapestConfiguredModel(): ModelInfo | undefined {
  const isAvailable = buildIsAvailable(getProviders());
  return getModels()
    .filter(isAvailable)
    .sort((a, b) => a.costPerMTokIn + a.costPerMTokOut - (b.costPerMTokIn + b.costPerMTokOut))[0];
}
