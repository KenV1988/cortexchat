import 'server-only';
import { SqliteMemoryStore, resolveEmbeddingProvider, type EmbeddingResolution } from '@cortexchat/memory';
import type { MemoryStore } from '@cortexchat/core';
import { getDb } from './db';

let store: MemoryStore | undefined;
let embeddingResolution: Promise<EmbeddingResolution> | undefined;

export function getMemoryStore(): MemoryStore {
  if (!store) store = new SqliteMemoryStore(getDb());
  return store;
}

/** Resolved once per process and cached — avoids re-probing Ollama reachability on every request. */
export function getEmbeddingResolution(): Promise<EmbeddingResolution> {
  if (!embeddingResolution) embeddingResolution = resolveEmbeddingProvider(process.env);
  return embeddingResolution;
}
