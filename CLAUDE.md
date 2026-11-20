# cortexchat — repository instructions

Local-first AI chat app that routes each message to the cheapest capable
model. Read `README.md` and `docs/ARCHITECTURE.md` before non-trivial work;
the ADRs in `docs/adr/` explain the provider interface, routing strategy and
memory design.

## Layout

```
apps/web             Next.js chat UI + API routes
apps/desktop         Electron shell; NOT in the pnpm workspace, built only in CI
packages/core        Types, classifier, router (no dependency on other packages)
packages/providers   OpenAI / Anthropic / Ollama / OpenRouter adapters
packages/db          SQLite schema + migrations (Drizzle ORM)
packages/memory      Working memory, semantic memory, summarization
config/models.yaml   Model registry — the router's escalation ladder
installers/windows   One-click .bat installer and start/stop/autostart scripts
```

## Commands

Node 20+, pnpm 9 (`packageManager` pins pnpm 9.12.0). Run from the repo root.

```bash
pnpm install
pnpm build        # builds packages/*; required before apps/web can resolve them
pnpm test         # vitest in every package; real SQLite, mocked HTTP, no live API calls
pnpm typecheck
pnpm lint
pnpm --filter @cortexchat/web dev      # http://localhost:3000
pnpm --filter <package> test           # targeted run, e.g. @cortexchat/core
```

After changing `packages/db/src/schema.ts`, generate a migration:

```bash
pnpm --filter @cortexchat/db run generate
```

CI (`.github/workflows/ci.yml`) runs: package build, typecheck, test, web
build, then a Docker image build. Match that before calling work done.

## Rules specific to this repo

- **The default registry must stay 100% free.** Every model in
  `config/models.yaml` costs $0, and
  `packages/core/src/__tests__/registryIntegration.test.ts` enforces it. Do
  not add a paid model to the default registry or relax that test.
- **Keep `packages/core` dependency-free.** It imports no other workspace
  package, no `fetch`, no database driver and no React. New providers,
  stores and embedders implement interfaces defined in `core`; `apps/web`
  (`lib/server/*.ts`) is the only place that wires implementations together.
- **Routing stays deterministic.** The classifier and router are pure and
  synchronous, with no model call and no network I/O.
- **Models are added in `config/models.yaml`,** not in code.
- **Tests never call live APIs.** Mock HTTP as the existing tests do.
- **Secrets live in `.env` only** (git-ignored). Never store API keys in the
  database, the browser or a committed file. Update `.env.example` when a
  new variable is introduced.
- **Don't add `apps/desktop` to `pnpm-workspace.yaml`;** it is excluded on
  purpose to keep Electron out of normal installs.
- Windows is a supported target (`installers/windows`, the desktop build).
  Check that script or path changes still work there.
- The app has no authentication by design in this milestone; don't describe
  it as safe to expose to the internet.
- Keep `README.md` and `docs/` in sync when behaviour or commands change.
  `docs/PRD.et.md` is the Estonian version of `docs/PRD.md`.
