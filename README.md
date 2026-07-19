# cortexchat

An open-source, local-first AI chat app that automatically routes every
message to the cheapest model capable of handling it — a free 0.5B local
model for "hello", escalating through bigger local models, then cheap open
cloud models, and only reaching for a premium frontier model when the task
actually needs it.

This is **milestone 1** of a larger vision (see [Scope](#scope) below): a
real, working, fully-tested web chat app with genuine model routing,
provider adapters, persistence, and memory — not a demo. Desktop apps,
mobile apps, multi-agent orchestration, RAG over files, and a plugin
marketplace are deliberately not built yet; see [Roadmap](#roadmap).

## Why

Every serious AI chat product defaults to routing 100% of traffic through
the most expensive model available. That's wasteful: a huge fraction of
real usage is greetings, small talk, and simple factual questions that a
500MB model running on a laptop CPU answers just as well as GPT-5 or Claude
Opus. cortexchat's router classifies every request and escalates only when
the task genuinely needs more capability — maximizing intelligence per
dollar and per watt instead of assuming more compute is always better.

## Quickstart

Requirements: Node.js 20+, pnpm 9+. [Ollama](https://ollama.com) is
optional but recommended — cortexchat works with zero API keys if it's
running locally.

```bash
git clone https://github.com/KenV1988/cortexchat.git
cd cortexchat
pnpm install

# Pull at least one tiny local model so the router has something to route to:
ollama pull qwen2.5:0.5b

cp .env.example .env   # optionally add OPENAI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY

pnpm build              # builds packages/* once so apps/web can import their compiled output
pnpm --filter @cortexchat/web dev
```

Open http://localhost:3000. Ask a question — the routing badge under each
reply shows exactly which model answered it, which tier it came from, and
why (click it for the full reasoning trail).

**Installing on desktop, Android, and iOS** (as a PWA from this same
codebase): see [docs/RUNNING.md](docs/RUNNING.md) for step-by-step
instructions per platform.

### Docker

```bash
docker compose up
```

Starts cortexchat plus a local Ollama sidecar. Add API keys via a `.env`
file in the repo root (same variables as `.env.example`) to enable cloud
escalation; omit them and it runs entirely offline against Ollama.

## Features (milestone 1)

- **Intelligent routing** — a deterministic, zero-cost rule-based
  classifier (no LLM call spent just to decide which LLM to call) sorts
  every message into one of 16 categories and picks the cheapest configured
  model that can handle it, escalating tiers on low confidence or an
  under-provisioned deployment. See [ADR 0002](docs/adr/0002-routing-strategy.md).
- **Provider-agnostic adapters** — OpenAI, Anthropic, Ollama, and
  OpenRouter today, all behind one `ProviderAdapter` interface. A new
  OpenAI-compatible endpoint (vLLM, llama.cpp server, LM Studio, ...) is a
  ~10 line adapter, not a new subsystem. See [ADR 0001](docs/adr/0001-provider-interface.md).
- **Real streaming chat** — SSE-based streaming from every provider,
  rendered incrementally with markdown + syntax highlighting.
- **Persistence** — conversations, messages, and routing metadata in local
  SQLite (via Drizzle ORM); folders, pinning, rename, delete.
- **Long-term memory** — semantic memory backed by embeddings (Ollama
  first, OpenAI fallback, graceful keyword-search degradation with
  neither configured), automatic importance scoring, recency-decayed
  pruning, and a settings-page inspector for viewing/editing/exporting
  everything stored. See [ADR 0003](docs/adr/0003-memory-design.md).
- **Working memory + summarization** — a sliding context window that
  auto-summarizes what falls out of budget using the cheapest configured
  model, so long conversations compress instead of silently losing context.
- **Config-driven model registry** — `config/models.yaml` is the single
  source of truth for which models exist, what tier and capabilities they
  have, and what they cost. Add, remove, or re-tier a model with a YAML
  edit — zero code changes.
- **Local-first, offline-capable** — with Ollama running and no API keys
  configured, cortexchat works fully offline for greetings, small talk,
  simple questions, code, math, writing, and planning. It degrades
  transparently (not silently) when a request needs a capability that
  isn't configured.
- **Dark/light theme, markdown, code highlighting, conversation
  history/folders/pinning** — the baseline ChatGPT-like UX.
- **Installable on desktop, Android, and iOS** — a PWA manifest, icons,
  and a phone-friendly drawer layout make the one codebase usable as an
  installed app on all four platforms ([docs/RUNNING.md](docs/RUNNING.md)).

## Scope

The full ambition for this project (see the original spec this milestone
was scoped from) includes native desktop/iOS/Android apps sharing one
codebase, a multi-agent system with specialized experts, RAG over
arbitrary file types including CAD formats, browser/terminal/Docker tool
use, MCP integration, prompt-injection defenses and sandboxed execution,
self-optimizing routing from collected metrics, and a plugin marketplace.
That is realistically a multi-year, multi-team product. This milestone
deliberately builds one thing all the way to "real, tested, and running"
rather than forty things as stubs. See [Roadmap](#roadmap) for the
honest list of what's next and in what order.

## Known gaps (by design, this milestone)

- **Image understanding, OCR, and audio transcription are classified but
  not routable.** The router's classifier recognizes these categories, but
  no model in `config/models.yaml` declares those capabilities and no file
  upload is wired into the chat UI yet — requests are only ever text.
  Routing such a request raises a typed `NoCapableModelError` rather than
  silently mishandling it. Wiring these up is the natural next milestone
  (see Roadmap).
- **No authentication.** This is a single-user, self-hosted app for now.
  Don't expose it to the open internet without putting it behind your own
  auth (a reverse proxy with basic auth, Tailscale, etc).
- **API keys live in `.env` only**, never in the database or the browser.
  The settings page shows configuration *status*, not an editable key
  form — that's a deliberate simplicity/security tradeoff for this
  milestone, not an oversight.
- **The router doesn't meter electricity.** Local models are treated as
  "free" for cost-routing purposes; a real energy-per-token model is
  future work.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system
design, module boundaries, and data flow. Short version:

```
apps/web            Next.js chat UI + API routes (the only app so far)
packages/core        Provider-agnostic types, the classifier, the router
packages/providers    OpenAI / Anthropic / Ollama / OpenRouter adapters
packages/db           SQLite schema + migrations (Drizzle ORM)
packages/memory       Working memory, semantic memory, summarization
config/models.yaml    The model registry — the router's escalation ladder
```

Every subsystem is an interface in `packages/core` with one or more
implementations elsewhere — swap SQLite for Postgres, or OpenAI embeddings
for a local model, by writing a new implementation of an existing
interface, not by touching the router or the UI.

## Development

```bash
pnpm install
pnpm build          # build packages/* (required before `next dev` will resolve them)
pnpm test           # 83 tests across every package, real SQLite + mocked HTTP, no live API calls
pnpm typecheck
pnpm --filter @cortexchat/web dev
```

Generating a new DB migration after changing `packages/db/src/schema.ts`:

```bash
pnpm --filter @cortexchat/db run generate
```

## Roadmap

Rough order, each phase assumed to land with the same bar (real, tested,
running — not stubbed):

1. **Multimodal**: image upload, a vision-capable adapter, OCR, audio
   transcription — closing the gap noted above.
2. **RAG over files**: PDF/Word/Excel/CSV/git-repo ingestion into semantic
   memory, cited in responses.
3. **Tool use**: MCP client support, function calling, a sandboxed
   terminal/filesystem tool with a real permission system.
4. **Multi-agent**: Planner/Programmer/Researcher/Reviewer roles composed
   on top of the existing router, activated only when a request actually
   classifies as `multi_agent_task`.
5. **Desktop + mobile**: Tauri or Electron for desktop, Expo/React Native
   for iOS/Android, sharing `packages/core` and `packages/providers`
   as-is.
6. **Self-optimization**: collect real latency/cost/success metrics per
   routing decision (the schema already stores category/tier/model on
   every message) and use them to tune the classifier's thresholds instead
   of the fixed constants it uses today.
7. **Auth + multi-user + plugin SDK.**

## License

MIT — see [LICENSE](LICENSE).
