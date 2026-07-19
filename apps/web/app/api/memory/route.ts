import { randomUUID } from 'node:crypto';
import type { MemoryKind } from '@cortexchat/core';
import { scoreMemoryItem } from '@cortexchat/memory';
import { getMemoryStore } from '../../../lib/server/memory';

export const runtime = 'nodejs';

/** Memory inspection + export: returns every stored item as plain JSON. */
export async function GET(): Promise<Response> {
  const store = getMemoryStore();
  const items = await store.all();
  return Response.json(items);
}

interface CreateBody {
  id?: string;
  kind: MemoryKind;
  content: string;
}
interface ImportBody {
  items: Array<{ id?: string; kind: MemoryKind; content: string }>;
}

/** Manual memory editing (add a fact/preference by hand) and bulk import. */
export async function POST(req: Request): Promise<Response> {
  const store = getMemoryStore();
  const body = (await req.json()) as CreateBody | ImportBody;
  const now = Date.now();

  const items = 'items' in body ? body.items : [body];
  const created = [];
  for (const item of items) {
    const id = item.id ?? randomUUID();
    await store.upsert({
      id,
      kind: item.kind,
      content: item.content,
      createdAt: now,
      lastAccessedAt: now,
      score: scoreMemoryItem(item.kind, item.content),
    });
    created.push(id);
  }

  return Response.json({ ids: created }, { status: 201 });
}

export async function DELETE(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id query param is required' }, { status: 400 });

  await getMemoryStore().remove(id);
  return Response.json({ ok: true });
}
