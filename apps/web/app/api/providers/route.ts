import { buildIsAvailable } from '@cortexchat/providers';
import { getModels, getProviders } from '../../../lib/server/providers';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const discover = url.searchParams.get('discover') === 'true';

  const providers = getProviders();
  const isAvailable = buildIsAvailable(providers);
  const models = getModels();

  const providerStatus = await Promise.all(
    [...providers.values()].map(async (adapter) => ({
      id: adapter.id,
      configured: adapter.isConfigured(),
      discoveredModels: discover ? await adapter.discoverModels() : undefined,
    })),
  );

  const modelStatus = models.map((m) => ({
    id: m.id,
    provider: m.provider,
    tier: m.tier,
    local: m.local,
    capabilities: m.capabilities,
    available: isAvailable(m),
    costPerMTokIn: m.costPerMTokIn,
    costPerMTokOut: m.costPerMTokOut,
  }));

  return Response.json({ providers: providerStatus, models: modelStatus });
}
