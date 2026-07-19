import { OpenAICompatibleAdapter } from './openai-compatible.js';

export function createOpenAIAdapter(env: NodeJS.ProcessEnv = process.env): OpenAICompatibleAdapter {
  return new OpenAICompatibleAdapter({
    id: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    getApiKey: () => env.OPENAI_API_KEY,
    requiresApiKey: true,
  });
}
