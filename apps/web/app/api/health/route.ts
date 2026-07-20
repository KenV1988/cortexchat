import { conversations } from '@cortexchat/db';
import { getDb } from '../../../lib/server/db';
import { getModels, getProviders } from '../../../lib/server/providers';

export const runtime = 'nodejs';

function errorDetail(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
}

/**
 * Self-diagnosis endpoint: open /api/health in a browser and every
 * subsystem reports ok or its actual error. Exists so a self-hosting user
 * can screenshot one page instead of digging through server logs.
 */
export async function GET(): Promise<Response> {
  const checks: Record<string, unknown> = {
    node: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    databasePath: process.env.DATABASE_PATH ?? './data/cortexchat.sqlite (default)',
  };

  try {
    const db = getDb();
    await db.select().from(conversations).limit(1);
    checks.database = 'ok';
  } catch (err) {
    checks.database = `ERROR: ${errorDetail(err)}`;
  }

  try {
    checks.modelRegistry = `ok (${getModels().length} models)`;
    checks.providers = [...getProviders().values()].map((p) => ({
      id: p.id,
      configured: p.isConfigured(),
    }));
  } catch (err) {
    checks.modelRegistry = `ERROR: ${errorDetail(err)}`;
  }

  const ollamaBase = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  try {
    const res = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const names = body.models?.map((m) => m.name) ?? [];
      checks.ollama = names.length
        ? `reachable, ${names.length} model(s) pulled: ${names.join(', ')}`
        : 'reachable, but NO models pulled yet — run: ollama pull qwen2.5:0.5b';
    } else {
      checks.ollama = `reachable but returned status ${res.status}`;
    }
  } catch {
    checks.ollama = `unreachable at ${ollamaBase} — is Ollama installed and running? (https://ollama.com)`;
  }

  return Response.json(checks);
}
