# ADR 0002: Deterministic rule-based routing, not an LLM router

## Status

Accepted.

## Context

The spec's whole premise is "maximum intelligence per watt and per
dollar" via a router that "should always choose the smallest capable
model" and "escalate only when confidence is low." The obvious
implementation of a classifier — asking a small LLM to classify the
request — is self-defeating: it spends an inference call (compute,
electricity, latency) to decide whether to spend a bigger inference call.
For high-volume categories like greetings and small talk, the
classification call would often cost more than the answer itself.

## Decision

`packages/core/src/classifier.ts` is pure, synchronous, dependency-free
pattern matching: regexes and keyword lists for code fences, math
notation, translation phrasing, research/current-events phrasing,
planning/writing phrasing, etc., plus message length and a token-count
estimate for long-context detection. It runs in microseconds and costs
nothing.

`packages/core/src/router.ts` maps each of the 16 categories to a minimum
tier (`tiny_local → medium_local → open_cloud → premium → moe`), escalates
one tier when classifier confidence is below `0.6`, and additionally
escalates when the conversation's estimated token count exceeds a chosen
model's context window. It then picks the cheapest model at-or-above the
required tier whose provider is actually configured, walking tiers upward
until it finds one — falling back to the best available option rather
than failing if the ideal tier isn't configured at all.

## Alternatives considered

- **LLM-based classification.** Rejected for the cost/latency reasons
  above. Revisit only if rule-based classification's error rate proves too
  high in practice — and even then, prefer a tiny local classifier model
  (e.g. a fine-tuned DistilBERT-scale model) over spending a full chat
  completion.
- **Embedding-similarity classification** (classify by nearest-neighbor to
  labeled examples). More robust to phrasing variation than regexes, but
  requires an embedding call per request (cost, latency, and an external
  dependency for something that should work with zero configuration) and
  a maintained labeled example set. Rule-based matching has none of those
  costs and is trivially unit-testable per category — see
  `packages/core/src/__tests__/classifier.test.ts`.
- **Always escalate on any ambiguity.** Rejected — defeats the purpose.
  The confidence threshold exists precisely to bound how often ambiguity
  triggers escalation, not to eliminate the tiny/medium local tiers.

## Consequences

- Misclassification is possible and silent-ish: a cleverly-phrased
  complex question that happens to match `simple_question`'s short-question
  heuristic gets routed to a small local model and may get a worse answer
  than it deserved. The confidence-based escalation and the visible
  routing badge (showing category + reasoning in the UI) are the
  mitigations — a user who notices a bad routing decision can see exactly
  why it happened.
- The classifier is a natural target for the "self-optimization" roadmap
  item: the schema already records `category`/`tier`/`escalated` on every
  message, so a future pass can mine that data for systematic
  misclassification patterns and tune the regex/threshold set — without
  ever needing to become an LLM call.
- Every category-to-tier mapping and confidence threshold is a named
  constant in `router.ts`, not a magic number scattered through the
  codebase — changing routing policy is a one-file change.
