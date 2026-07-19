import { OpenAICompatibleAdapter } from './openai-compatible.js';

export function createOpenRouterAdapter(env: NodeJS.ProcessEnv = process.env): OpenAICompatibleAdapter {
  return new OpenAICompatibleAdapter({
    id: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    getApiKey: () => env.OPENROUTER_API_KEY,
    requiresApiKey: true,
    // OpenRouter asks integrators to identify their app; harmless if omitted
    // but good citizenship, and required by some of their rate-limit tiers.
    extraHeaders: {
      'HTTP-Referer': env.CORTEXCHAT_PUBLIC_URL ?? 'https://github.com/KenV1988/cortexchat',
      'X-Title': 'cortexchat',
    },
  });
}
