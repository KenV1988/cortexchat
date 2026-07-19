# cortexchat — Product Requirements Document

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-07-19 |
| **Status** | Milestone 1 shipped; roadmap approved |
| **Repository** | https://github.com/KenV1988/cortexchat |
| **License** | MIT (fully open source) |

---

## 1. Summary

cortexchat is an open-source, self-hosted AI chat application that feels
comparable to ChatGPT or Claude in daily use while costing **$0 to run**.
Its core innovation is an intelligent model router: every message is
classified (in microseconds, without any model call) and sent to the
smallest free model capable of answering it well — a tiny local model for
greetings, a mid-size local model for code and writing, and the strongest
free open-source cloud models only for genuinely hard reasoning. The user
never chooses a model; the system's choice and its reasoning are always
visible.

## 2. Problem & opportunity

Mainstream AI chat products route every message — including "hello" —
through frontier models that are expensive, energy-hungry, and
cloud-locked. Users pay subscriptions, surrender their conversation data,
and lose access entirely when offline. Meanwhile, open-source models
running on ordinary laptops now answer a large share of everyday requests
just as well.

The opportunity: a chat product whose *default* is free, private, and
local, escalating to bigger (still free, still open-source) models only
when a request genuinely demands it — maximum intelligence per watt and
per dollar.

## 3. Goals & success criteria

1. **Feel comparable to ChatGPT/Claude** in everyday use: streaming
   answers, markdown and code rendering, conversation history, memory of
   the user across sessions.
2. **Cost $0 by default.** Every model in the shipped registry is free —
   enforced by an automated test that fails if a paid model is added.
3. **Route intelligently.** ≥90% of greetings/small-talk/simple questions
   handled by a local model when Ollama is available; escalation only on
   classified need or low confidence; the routing decision always
   explainable in the UI.
4. **Work offline.** With local models installed, core chat works with no
   internet at all, degrading transparently (never silently).
5. **Run everywhere from one codebase.** Web natively; desktop, Android,
   and iOS via PWA install.
6. **No provider lock-in.** Every subsystem (LLM provider, embeddings,
   database, memory) sits behind an interface; swapping implementations
   requires configuration, not code changes.

## 4. Non-goals (current milestone)

- Native binaries (.exe/.dmg/.apk/.ipa) — planned via Tauri/Expo (§12).
- Multi-user accounts and authentication — single-user, self-hosted.
- Image understanding, OCR, audio — classified by the router but not yet
  routable; requests fail with a typed error rather than mishandling.
- Web search / RAG over documents / tool use / multi-agent execution —
  roadmap items, deliberately not stubbed.
- Monetization of any kind. The project is MIT-licensed and free.

## 5. Target users

- **Privacy-conscious individuals** who want AI chat without sending
  every keystroke to a US cloud provider.
- **Cost-sensitive users** (students, hobbyists) who want ChatGPT-class
  utility with no subscription.
- **Self-hosters and tinkerers** who run home servers and want a modular,
  hackable AI stack.
- **Developers** who want a clean reference architecture for
  provider-agnostic LLM routing.

## 6. Product principles

1. **Free first.** The default experience must never cost money.
2. **Local first.** Prefer the user's own hardware; the cloud is an
   escalation, not a dependency.
3. **Transparent, not magical.** Every routing decision shows which model
   answered and why. Degraded modes are visible, never silent.
4. **Real or absent.** Features ship working and tested, or they are
   documented as not-yet-built. No stubs pretending to work.
5. **Replaceable everything.** Interfaces over implementations; YAML over
   code changes.

## 7. Functional requirements

### 7.1 Implemented (Milestone 1)

| ID | Requirement | Status |
|----|-------------|--------|
| F1 | Streaming chat with markdown + syntax-highlighted code | ✅ |
| F2 | Rule-based request classification into 16 categories, zero model calls | ✅ |
| F3 | Tiered routing (tiny local → medium local → open cloud → flagship → MoE), cheapest capable model wins, confidence-based escalation | ✅ |
| F4 | Provider adapters: Ollama, OpenRouter, OpenAI, Anthropic behind one interface | ✅ |
| F5 | Config-driven model registry (YAML) — add/remove/re-tier models with no code | ✅ |
| F6 | Conversation persistence: history, rename, pin, folders, delete | ✅ |
| F7 | Long-term memory: semantic (embedding) search with keyword fallback, importance scoring, recency-decay forgetting | ✅ |
| F8 | Working-memory window with automatic summarization of trimmed context via the cheapest model | ✅ |
| F9 | Memory inspection UI: view, add, delete, export everything remembered | ✅ |
| F10 | Routing transparency badge on every answer (model, tier, category, reasoning) | ✅ |
| F11 | Dark/light theme, responsive mobile layout, PWA install on 4 platforms | ✅ |
| F12 | Provider/model status page | ✅ |

### 7.2 Planned (in roadmap order)

| ID | Requirement | Phase |
|----|-------------|-------|
| P1 | Image upload + vision-capable free models; OCR; audio transcription | 2 |
| P2 | File ingestion (PDF/Word/Excel/CSV/repos) into memory with cited answers (RAG) | 3 |
| P3 | Tool use: MCP client, function calling, sandboxed terminal/filesystem with permission prompts | 4 |
| P4 | Multi-agent execution (planner/programmer/researcher/reviewer) activated only for multi-part tasks | 5 |
| P5 | Native desktop (Tauri) and mobile (Expo) shells sharing the existing packages | 6 |
| P6 | Self-optimizing router: mine stored routing metadata to tune classifier thresholds | 7 |
| P7 | Optional authentication + multi-user mode; plugin SDK | 8 |

## 8. Non-functional requirements

- **Cost:** default registry 100% free (test-enforced). Free cloud tier
  requires an OpenRouter account but no payment method.
- **Privacy:** conversations and memory stored only in a local SQLite
  file; nothing leaves the machine unless a request routes to a cloud
  model. API keys live in `.env`, never in the database or browser.
- **Performance:** classification adds <1ms; first token from local tiny
  models typically <1s on modern laptops.
- **Offline:** full functionality for locally-covered categories with no
  network; visible degradation otherwise.
- **Quality:** strict TypeScript everywhere; 70+ automated tests across
  every package; CI runs typecheck, tests, web build, and Docker build.
- **Portability:** Node 20+, any OS; Docker image provided; SQLite means
  zero external infrastructure.

## 9. Platforms & distribution

One codebase. The server runs on the user's PC/home server/cloud box;
clients connect from any device.

| Platform | Delivery | Install path |
|----------|----------|--------------|
| Web | Next.js app | open in any browser |
| Desktop (Win/macOS/Linux) | PWA | Chrome/Edge address-bar install button |
| Android | PWA | Chrome → Add to Home screen |
| iOS/iPadOS | PWA | Safari → Share → Add to Home Screen |

Distribution today is source (git clone / release archive) + Docker.
Native store distribution is out of scope until P5.

## 10. Architecture overview

Monorepo of five workspaces: `packages/core` (types, classifier, router —
zero dependencies), `packages/providers` (LLM adapters),
`packages/db` (SQLite/Drizzle), `packages/memory` (working + semantic
memory), `apps/web` (Next.js UI + API). Full detail in
[ARCHITECTURE.md](ARCHITECTURE.md) and three ADRs.

## 11. Metrics of success

- % of requests served by each tier (target: majority local when Ollama
  present) — routing metadata is already persisted per message.
- Zero dollars billed across normal usage (structurally guaranteed).
- Time-to-first-token per tier.
- Test suite green on every commit.

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| OpenRouter retires/limits free models | Registry is YAML-editable in seconds; local tiers unaffected; test suite catches capability gaps |
| Misclassification routes hard question to weak model | Confidence-based escalation; visible routing badge; roadmap P6 tunes from real data |
| PWA limits vs native apps (no push, iOS quirks) | Acceptable for M1; native shells planned (P5) |
| Ollama not installed → degraded local story | App remains functional via free cloud tier; clear status page + docs |
| Single-user assumption held too long | Auth/multi-user explicitly on roadmap (P7) before any public-hosting story |

## 13. Milestones

- **M1 (shipped):** everything in §7.1 — working, tested, documented.
- **M2–M8:** one roadmap phase each (§7.2), each landing fully working
  with tests before the next begins.
