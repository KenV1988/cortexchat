/**
 * Core provider-agnostic types shared by every subsystem. Nothing in this
 * file may import from a concrete provider, storage, or UI package — that
 * boundary is what keeps every subsystem swappable through configuration.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * The full set of request categories the router can classify a turn into.
 * Kept as a union (not an open string) so the classifier and the model
 * registry's capability tags stay in lockstep at compile time.
 */
export type Category =
  | 'greeting'
  | 'small_talk'
  | 'simple_question'
  | 'complex_reasoning'
  | 'programming'
  | 'math'
  | 'image_understanding'
  | 'ocr'
  | 'audio'
  | 'research'
  | 'translation'
  | 'planning'
  | 'writing'
  | 'document_analysis'
  | 'long_context'
  | 'multi_agent_task';

export type Tier = 'tiny_local' | 'medium_local' | 'open_cloud' | 'premium' | 'moe';

export const TIER_ORDER: readonly Tier[] = [
  'tiny_local',
  'medium_local',
  'open_cloud',
  'premium',
  'moe',
];

export interface Classification {
  category: Category;
  /** 0..1 confidence in the category assignment. Low confidence triggers escalation. */
  confidence: number;
  /** Human-readable signals that drove the decision, surfaced in the UI for transparency. */
  signals: string[];
  /** Rough token estimate of the conversation, used for context-window and long-context routing. */
  estimatedTokens: number;
}

export interface ModelInfo {
  id: string;
  provider: string;
  tier: Tier;
  contextWindow: number;
  capabilities: Category[];
  local: boolean;
  /** USD per million input/output tokens. 0 for local models (electricity cost is out of scope for $ routing). */
  costPerMTokIn: number;
  costPerMTokOut: number;
  /** Env var that must be set for this model to be usable, if any (local models typically have none). */
  requiresEnv?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'error';
  /** Populated on the terminal chunk when the provider reports usage. */
  usage?: { promptTokens: number; completionTokens: number };
}

export interface ChatParams {
  model: string;
  messages: Message[];
  options?: ChatOptions;
}

/**
 * The single interface every LLM backend must implement. Adding a new
 * provider (a new frontier API, a new local runtime) means writing one
 * class that satisfies this contract — nothing else in the system changes.
 */
export interface ProviderAdapter {
  readonly id: string;
  /** Whether this adapter is currently usable (key present / endpoint reachable). Cheap, sync, no network call. */
  isConfigured(): boolean;
  /**
   * Live discovery of model IDs actually reachable at this endpoint right
   * now (e.g. Ollama's locally-pulled models, or a provider's /models
   * list). Used for connection-testing and the settings UI — routing
   * decisions always use the static config/models.yaml registry, never
   * this, so routing stays deterministic and testable without network I/O.
   */
  discoverModels(): Promise<string[]>;
  chat(params: ChatParams): AsyncIterable<StreamChunk>;
}

/** Pluggable embedding backend for semantic memory and RAG. */
export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  isConfigured(): boolean;
  embed(texts: string[]): Promise<number[][]>;
}

export interface RoutingDecision {
  model: ModelInfo;
  category: Category;
  confidence: number;
  tier: Tier;
  escalated: boolean;
  reasoning: string[];
}

export class NoCapableModelError extends Error {
  constructor(category: Category) {
    super(`No configured provider has a model capable of handling category "${category}".`);
    this.name = 'NoCapableModelError';
  }
}

export type MemoryKind = 'fact' | 'preference' | 'project' | 'goal' | 'summary' | 'entity_relation';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  content: string;
  /** Embedding vector, absent when no EmbeddingProvider is configured (degraded mode). */
  embedding?: number[];
  createdAt: number;
  lastAccessedAt: number;
  /** Automatic importance score in [0,1], used for pruning low-value memories. */
  score: number;
  conversationId?: string;
}

/**
 * Long-term memory storage, pluggable independent of which vector index or
 * database backs it. The default implementation (packages/memory) uses
 * SQLite with brute-force cosine similarity, which is genuinely fast enough
 * for a single user's memory store up to tens of thousands of items — no
 * external vector DB required to run locally.
 */
export interface MemoryStore {
  upsert(item: MemoryItem): Promise<void>;
  /** Semantic search by a precomputed query embedding. Returns items sorted by similarity. */
  search(queryEmbedding: number[], limit: number): Promise<MemoryItem[]>;
  /** Keyword fallback search used when no EmbeddingProvider is configured. */
  searchByKeyword(query: string, limit: number): Promise<MemoryItem[]>;
  all(): Promise<MemoryItem[]>;
  remove(id: string): Promise<void>;
  /** Deletes items scoring below the retention threshold; returns count removed. */
  prune(minScore: number): Promise<number>;
}
