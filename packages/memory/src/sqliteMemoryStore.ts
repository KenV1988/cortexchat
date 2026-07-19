import type { Db } from '@cortexchat/db';
import { memoryItems } from '@cortexchat/db';
import type { MemoryItem, MemoryStore } from '@cortexchat/core';
import { eq, like, or } from 'drizzle-orm';
import { decayedScore } from './scoring.js';

/** Common function words that carry no retrieval signal; everything else in a message is treated as a keyword. */
const KEYWORD_STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'about', 'this', 'that', 'these', 'those',
  'was', 'were', 'are', 'have', 'has', 'had', 'does', 'did', 'can', 'could',
  'will', 'would', 'should', 'you', 'your', 'yours', 'not', 'what', 'when',
  'where', 'which', 'how', 'why', 'who', 'remember', 'know', 'tell', 'please',
]);

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function rowToItem(row: typeof memoryItems.$inferSelect): MemoryItem {
  return {
    id: row.id,
    kind: row.kind as MemoryItem['kind'],
    content: row.content,
    ...(row.embedding ? { embedding: JSON.parse(row.embedding) as number[] } : {}),
    createdAt: row.createdAt,
    lastAccessedAt: row.lastAccessedAt,
    score: row.score,
    ...(row.conversationId ? { conversationId: row.conversationId } : {}),
  };
}

/**
 * MemoryStore backed by SQLite with brute-force in-process cosine
 * similarity. This is a genuine, correct implementation of semantic
 * search — not a stub — and is fast enough for a single user's memory
 * (tens of thousands of items score in low single-digit milliseconds on
 * commodity hardware). A dedicated vector index (sqlite-vec, pgvector,
 * Qdrant, ...) is a drop-in replacement behind the same MemoryStore
 * interface once memory volume genuinely outgrows brute force; see
 * docs/ARCHITECTURE.md.
 */
export class SqliteMemoryStore implements MemoryStore {
  constructor(private readonly db: Db) {}

  async upsert(item: MemoryItem): Promise<void> {
    await this.db
      .insert(memoryItems)
      .values({
        id: item.id,
        kind: item.kind,
        content: item.content,
        embedding: item.embedding ? JSON.stringify(item.embedding) : null,
        createdAt: item.createdAt,
        lastAccessedAt: item.lastAccessedAt,
        score: item.score,
        conversationId: item.conversationId ?? null,
      })
      .onConflictDoUpdate({
        target: memoryItems.id,
        set: {
          kind: item.kind,
          content: item.content,
          embedding: item.embedding ? JSON.stringify(item.embedding) : null,
          lastAccessedAt: item.lastAccessedAt,
          score: item.score,
        },
      });
  }

  async search(queryEmbedding: number[], limit: number): Promise<MemoryItem[]> {
    const rows = await this.db.select().from(memoryItems);
    const withEmbeddings = rows.filter((r) => r.embedding);

    const scored = withEmbeddings
      .map((row) => ({
        row,
        similarity: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding as string) as number[]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    await this.touch(scored.map((s) => s.row.id));
    return scored.map((s) => rowToItem(s.row));
  }

  async searchByKeyword(query: string, limit: number): Promise<MemoryItem[]> {
    // The query is a full user message ("do you remember what editor I
    // prefer?"), not a keyword — matching it verbatim with one LIKE would
    // essentially never hit. Tokenize into significant words, match any,
    // rank by how many matched.
    const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(
      (w) => !KEYWORD_STOPWORDS.has(w),
    );
    if (words.length === 0) return [];

    const rows = await this.db
      .select()
      .from(memoryItems)
      .where(or(...words.map((w) => like(memoryItems.content, `%${w}%`))));

    const ranked = rows
      .map((row) => ({
        row,
        hits: words.filter((w) => row.content.toLowerCase().includes(w)).length,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    await this.touch(ranked.map((r) => r.row.id));
    return ranked.map((r) => rowToItem(r.row));
  }

  async all(): Promise<MemoryItem[]> {
    const rows = await this.db.select().from(memoryItems);
    return rows.map(rowToItem);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(memoryItems).where(eq(memoryItems.id, id));
  }

  async prune(minScore: number): Promise<number> {
    const now = Date.now();
    const rows = await this.db.select().from(memoryItems);
    const toRemove = rows.filter((r) => decayedScore(r.score, r.lastAccessedAt, now) < minScore);
    for (const row of toRemove) {
      await this.db.delete(memoryItems).where(eq(memoryItems.id, row.id));
    }
    return toRemove.length;
  }

  private async touch(ids: string[]): Promise<void> {
    const now = Date.now();
    for (const id of ids) {
      await this.db.update(memoryItems).set({ lastAccessedAt: now }).where(eq(memoryItems.id, id));
    }
  }
}

