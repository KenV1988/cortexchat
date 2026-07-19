import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('New chat'),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'system' | 'user' | 'assistant' | 'tool'
  content: text('content').notNull(),
  // Routing metadata, populated for assistant messages so the UI can show
  // "answered by qwen2.5:14b (medium_local) — classified as programming".
  model: text('model'),
  provider: text('provider'),
  category: text('category'),
  tier: text('tier'),
  escalated: integer('escalated', { mode: 'boolean' }),
  createdAt: integer('created_at').notNull(),
});

export const memoryItems = sqliteTable('memory_items', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // MemoryKind
  content: text('content').notNull(),
  // JSON-encoded number[] embedding, null when no EmbeddingProvider was configured at write time.
  embedding: text('embedding'),
  createdAt: integer('created_at').notNull(),
  lastAccessedAt: integer('last_accessed_at').notNull(),
  score: real('score').notNull().default(sql`0.5`),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
});
