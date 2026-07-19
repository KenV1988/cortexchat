# Architecture

## Goals this design optimizes for

1. **No provider lock-in.** Every external dependency (LLM, embeddings,
   database) sits behind an interface defined in `packages/core`, with zero
   knowledge of which implementation is in use.
2. **Cheapest capable model wins.** Routing is a deterministic, explainable
   decision — not a black box — and never itself costs an inference call.
3. **Correctness over completeness.** A small number of subsystems that
   are genuinely real beats a large number that are stubbed. See the
   README's "Known gaps" section for exactly what's out of scope right now.

## Package graph

```
apps/web
  ├─ packages/memory
  │    ├─ packages/core
  │    └─ packages/db
  ├─ packages/providers
  │    └─ packages/core
  ├─ packages/db
  └─ packages/core
```

`packages/core` has zero dependencies on any other workspace package — it
defines the vocabulary (`Message`, `ModelInfo`, `ProviderAdapter`,
`MemoryStore`, `Category`, `RoutingDecision`, ...) that every other package
implements or consumes. Nothing in `core` imports `fetch`, a database
driver, or React. This is what "plug-in architecture" concretely means
here: `providers`, `db`, and `memory` are three independent, swappable
implementations of interfaces `core` defines, and `apps/web` is the one
place that wires a specific choice of each together (`lib/server/*.ts`).

## Request lifecycle

1. Browser POSTs `{ conversationId?, message }` to `/api/chat`.
2. The route handler persists the user message, loads full history from
   SQLite, and calls `streamAssistantReply()` (`apps/web/lib/server/chatOrchestrator.ts`) —
   the one place every subsystem actually composes.
3. **Routing**: `Router.route(history)` (`packages/core/src/router.ts`)
   runs the classifier (`packages/core/src/classifier.ts`), determines the
   minimum tier the category requires, escalates on low confidence or an
   unmet context-window requirement, and picks the cheapest *configured*
   model at-or-above that tier from `config/models.yaml`. This step is
   pure and synchronous — no network I/O, fully unit-tested.
4. **Working memory**: `buildWorkingMemory()` (`packages/memory`) trims the
   conversation to fit half the chosen model's context window, preserving
   the system message and the most recent turns.
5. **Long-term memory retrieval**: the latest user message is embedded
   (if an `EmbeddingProvider` is configured) or matched by keyword, and
   relevant `MemoryItem`s are injected as an extra system message.
6. **Generation**: the resolved `ProviderAdapter.chat()` streams
   `StreamChunk`s back through the orchestrator, which re-emits them as
   NDJSON events (`meta` → `delta`* → `done`, or `error`) over the HTTP
   response body. The client (`components/ChatWindow.tsx`) parses this
   stream incrementally.
7. **Persistence**: the assistant's full text and routing metadata
   (model/provider/category/tier/escalated) are written to `messages` once
   the stream completes.
8. **Archival**: whatever `buildWorkingMemory` trimmed is summarized (using
   the cheapest configured model, not necessarily the one that answered)
   and stored as a `summary`-kind `MemoryItem`, best-effort — a failed
   summarization never fails the turn that already succeeded.

## The router in detail

See [ADR 0002](adr/0002-routing-strategy.md) for the reasoning; this is the
mechanical summary.

- `classify()` is pure pattern matching (regexes, keyword lists, message
  length, code-fence detection) against the latest user message — no model
  call. It returns a `Category`, a confidence in `[0,1]`, and human-readable
  signals surfaced in the UI's routing badge.
- `CATEGORY_MIN_TIER` maps each of the 16 categories to a minimum tier
  (`tiny_local → medium_local → open_cloud → premium → moe`).
- Confidence below `0.6` escalates the required tier by one step — a
  cheap safety margin against misclassification.
- The router walks tiers upward from the requirement until it finds a
  *configured* model with the needed capability tag, picking the cheapest
  one at that tier. If nothing at or above the required tier is
  configured, it falls back to the best configured option below it rather
  than failing outright.
- If literally no configured model declares the needed capability, it
  throws a typed `NoCapableModelError` — this is how the image/OCR/audio
  gap surfaces (see README).

## Memory design

See [ADR 0003](adr/0003-memory-design.md). Three layers, each independently
optional/degradable:

- **Working memory** — a sliding window over the current conversation,
  pure and synchronous, always available.
- **Semantic memory** — `SqliteMemoryStore` (`packages/memory`) does
  brute-force cosine similarity over embeddings stored as JSON in SQLite.
  Genuinely correct and fast enough for one user's memory (tens of
  thousands of items, low single-digit milliseconds) — not a stub pending
  a "real" vector DB. Swap in `sqlite-vec`, pgvector, or Qdrant behind the
  same `MemoryStore` interface if/when volume actually demands it.
- **Keyword fallback** — when no `EmbeddingProvider` resolves (no Ollama,
  no OpenAI key), semantic search transparently degrades to SQL `LIKE`
  matching rather than silently returning nothing or throwing.

Importance scoring (`scoreMemoryItem`) and recency decay (`decayedScore`)
are simple, deterministic, and unit-tested — a preference or goal starts
above a summary, and everything decays toward zero if unaccessed for
~90-day half-lives, so `prune()` naturally forgets stale trivia.

## Known gaps / explicit non-goals of this milestone

- **Multimodal capabilities are classified but not routable** — see
  README. This is enforced by a test
  (`packages/core/src/__tests__/registryIntegration.test.ts`) that fails
  loudly if the registry and the documented gap list drift apart.
- **No standalone Docker trace output.** The Docker image ships the full
  monorepo (source + `node_modules`) rather than Next's minimal
  `output: 'standalone'` trace, because the app reads
  `config/models.yaml` and `packages/db/drizzle/*.sql` at runtime — files
  Next's dependency tracer can't see since they're never `import`-ed as
  JS. Correctness over image size for a self-hosted single-user app.
- **`better-sqlite3` requires matching the runtime's libc.** The Docker
  build and runtime stages deliberately share the same Debian base image;
  don't switch either stage to Alpine without rebuilding the native addon
  for musl.
- **No energy metering.** Local (Ollama) models are treated as
  zero-cost for routing purposes. A real joules-per-token model is future
  work (see README Roadmap item 6).

## Testing philosophy

Every package has unit tests that exercise real logic against real
dependencies where feasible: `packages/db` and `packages/memory` run
migrations against a real (temp-file) SQLite database rather than mocking
the ORM; `packages/providers` mocks only the network boundary (`fetch`)
and exercises the actual SSE-parsing and request-shaping code; the router
and classifier are pure functions tested with plain assertions. 83 tests,
no live API calls, deterministic, fast (~3s for the whole monorepo).
