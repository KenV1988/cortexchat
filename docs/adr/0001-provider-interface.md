# ADR 0001: One `ProviderAdapter` interface for every LLM backend

## Status

Accepted.

## Context

The spec requires supporting OpenAI, Anthropic, Gemini, DeepSeek, Qwen,
Llama, Mistral, Phi, Gemma, Ollama, vLLM, llama.cpp, OpenRouter, and "any
OpenAI-compatible endpoint" — with "adding a new provider should require
only a new adapter." Most of those are not really distinct APIs: OpenAI,
Ollama, OpenRouter, vLLM, and llama.cpp servers, and LM Studio all expose
(or can expose) the same `/v1/chat/completions` wire format. Anthropic is
the one genuine outlier with its own `/v1/messages` shape and SSE event
schema.

## Decision

Define one interface in `packages/core/src/types.ts`:

```ts
interface ProviderAdapter {
  readonly id: string;
  isConfigured(): boolean;
  discoverModels(): Promise<string[]>;
  chat(params: ChatParams): AsyncIterable<StreamChunk>;
}
```

and two concrete implementation strategies in `packages/providers`:

1. `OpenAICompatibleAdapter` — a single class parameterized by base URL,
   API-key getter, and whether a key is required. `createOpenAIAdapter`,
   `createOllamaAdapter`, and `createOpenRouterAdapter` are thin factory
   functions instantiating it with different config. Ollama additionally
   overrides `discoverModels()` to hit its native `/api/tags` instead of
   the generic `/models` shape, since that's what actually reports what's
   been `ollama pull`-ed locally.
2. `createAnthropicAdapter` — a hand-written implementation of the same
   interface for Anthropic's distinct wire format.

Routing decisions (which model to use) are made entirely against
`config/models.yaml`, a static registry — never against `discoverModels()`,
which exists purely for the settings UI ("is this endpoint actually
reachable, what's actually available"). This keeps routing deterministic
and testable without network I/O.

## Consequences

- Adding vLLM, llama.cpp's server mode, or LM Studio requires zero new
  code — they're all OpenAI-compatible; point `createOpenAIAdapter`'s
  pattern at a new base URL via `config/models.yaml` + an env var.
- Adding Gemini (a genuinely different wire format, like Anthropic) means
  writing one new file implementing `ProviderAdapter`, same shape as
  `anthropic.ts`. Not built in this milestone (see README Known gaps) but
  the seam is exactly where it should be.
- The interface is deliberately minimal (three methods). It does not yet
  express tool-calling, vision inputs, or embeddings — those are either
  out of scope for this milestone or (embeddings) a separate
  `EmbeddingProvider` interface, kept apart because not every chat
  provider offers embeddings and vice versa.
