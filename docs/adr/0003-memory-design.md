# ADR 0003: Brute-force SQLite vector search, embedding-optional

## Status

Accepted.

## Context

The spec asks for "unlimited long-term memory," semantic search,
"automatic memory scoring," "automatic forgetting of low-value
information," and full inspection/editing/export — while also demanding
the whole system "run locally whenever possible" and "continue
functioning offline" with graceful degradation. A dedicated vector
database (Qdrant, pgvector, etc.) is the standard answer for semantic
memory but is a heavyweight dependency for what is, for a single user,
a small dataset — and it would break the zero-external-infra,
`sqlite`-file self-hosting story the rest of the app relies on.

## Decision

`SqliteMemoryStore` (`packages/memory/src/sqliteMemoryStore.ts`) stores
`MemoryItem`s in the same SQLite database as conversations, with
embeddings as a JSON-encoded `number[]` column. `search()` loads every
item with a non-null embedding and computes cosine similarity in-process,
sorting and slicing to the requested limit. This is genuinely correct
semantic search — not an approximation or a stub — and fast enough for a
single user's memory (tens of thousands of items score in low
single-digit milliseconds on commodity hardware; a person accumulates
memory items far slower than that ceiling).

Embeddings themselves come from a resolvable `EmbeddingProvider`
(`packages/memory/src/embeddings/resolve.ts`), tried in local-first order:
Ollama's `/api/embed` (free, private, offline) first, then OpenAI's
`/v1/embeddings` if a key is configured, then explicit degraded mode. In
degraded mode, `searchByKeyword()` (a SQL `LIKE` query) stands in for
semantic search — memory still works, just less precisely, and the app
never silently pretends to have semantic recall it doesn't have.

Scoring (`scoreMemoryItem`) is a deterministic function of memory kind
(preferences/goals score higher than passing summaries) and content
length. Pruning (`prune(minScore)`) applies an exponential recency decay
(`decayedScore`, 90-day half-life) on top of the base score before
comparing against the threshold, so unused memories fade even if they
were once important — "automatic forgetting" without any ML model in the
loop.

## Alternatives considered

- **A dedicated vector database from day one.** Rejected for this
  milestone: adds an external service dependency that contradicts
  "runs locally whenever possible" for what is, in practice, a small
  dataset. `MemoryStore` is an interface specifically so this can be
  swapped in later (Qdrant, pgvector, sqlite-vec) without touching any
  caller — see `packages/core/src/types.ts`.
- **Requiring an embedding provider.** Rejected — would make semantic
  memory (and by extension, a chunk of the app) fail entirely for a user
  with no Ollama and no OpenAI key, violating "continue functioning
  offline, gracefully degrade."
- **ML-based importance scoring** (e.g. asking a model to rate memory
  importance). Rejected for the same cost/latency reasoning as ADR 0002 —
  a deterministic kind+recency function is legible, testable, and free.

## Consequences

- Semantic search quality is bounded by brute-force cosine similarity's
  practical scale — fine today, would need the vector-DB swap mentioned
  above if a single user's memory somehow reached millions of items.
- Two different users of the same deployment get meaningfully different
  memory quality depending on whether they have Ollama running — this is
  visible in the settings page's provider status, not hidden.
- The 90-day half-life and score weights (`packages/memory/src/scoring.ts`)
  are guesses, not tuned against real usage data; they're isolated in one
  file specifically so they're easy to revisit.
