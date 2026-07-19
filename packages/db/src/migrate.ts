import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';

const path = process.env.DATABASE_PATH ?? './data/cortexchat.sqlite';
const { db, sqlite } = createDb(path);

migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
console.log(`Migrations applied to ${path}`);
sqlite.close();
