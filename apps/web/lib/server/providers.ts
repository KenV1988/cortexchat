import 'server-only';
import path from 'node:path';
import { createDefaultProviders, buildIsAvailable } from '@cortexchat/providers';
import { loadModelRegistry, Router, type ModelInfo } from '@cortexchat/core';
import type { ProviderAdapter } from '@cortexchat/core';

let cached:
  | {
      providers: Map<string, ProviderAdapter>;
      models: ModelInfo[];
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

  cached = { providers, models };
  return cached;
}

export function getProviders(): Map<string, ProviderAdapter> {
  return context().providers;
}

export function getModels(): ModelInfo[] {
  return context().models;
}

export function getProviderFor(model: ModelInfo): ProviderAdapter {
  const adapter = getProviders().get(model.provider);
  if (!adapter) throw new Error(`No adapter registered for provider "${model.provider}"`);
  return adapter;
}

// ---------------------------------------------------------------------------
// Live Ollama availability
//
// "Configured" (a key exists / an endpoint is set) is not the same as
// "actually able to answer": Ollama may not be installed, not running, or
// running without the specific model pulled. Routing a request to a model
// that cannot run just produces an opaque fetch error, so availability for
// local models is probed live (with a short TTL cache — installing Ollama
// or pulling a model becomes visible without restarting the app).
// ---------------------------------------------------------------------------

export interface OllamaStatus {
  reachable: boolean;
  /** Model tags reported by the local Ollama daemon, both raw and with ':latest' stripped. */
  pulled: Set<string>;
}

let ollamaCache: { status: OllamaStatus; checkedAt: number } | undefined;
const OLLAMA_STATUS_TTL_MS = 30_000;

export async function getOllamaStatus(): Promise<OllamaStatus> {
  if (ollamaCache && Date.now() - ollamaCache.checkedAt < OLLAMA_STATUS_TTL_MS) {
    return ollamaCache.status;
  }

  const base = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  let status: OllamaStatus = { reachable: false, pulled: new Set() };
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const names = (body.models ?? []).flatMap((m) =>
        m.name.endsWith(':latest') ? [m.name, m.name.slice(0, -':latest'.length)] : [m.name],
      );
      status = { reachable: true, pulled: new Set(names) };
    }
  } catch {
    // Unreachable — a completely normal state (Ollama not installed / not running).
  }

  ollamaCache = { status, checkedAt: Date.now() };
  return status;
}

/** Availability predicate combining static key configuration (cloud) with the live Ollama probe (local). */
export function isAvailableWith(status: OllamaStatus): (model: ModelInfo) => boolean {
  const configured = buildIsAvailable(getProviders());
  return (model) =>
    model.provider === 'ollama' ? status.reachable && status.pulled.has(model.id) : configured(model);
}

/** Router built against what can actually answer right now. */
export async function getRouter(): Promise<Router> {
  const status = await getOllamaStatus();
  return new Router(getModels(), { isAvailable: isAvailableWith(status) });
}

/** The cheapest genuinely-available model, used for low-stakes internal work like summarization. */
export async function cheapestAvailableModel(): Promise<ModelInfo | undefined> {
  const isAvailable = isAvailableWith(await getOllamaStatus());
  return getModels()
    .filter(isAvailable)
    .sort((a, b) => a.costPerMTokIn + a.costPerMTokOut - (b.costPerMTokIn + b.costPerMTokOut))[0];
}
