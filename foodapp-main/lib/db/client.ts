import { drizzle } from "drizzle-orm/mysql2";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

type Database = ReturnType<typeof drizzle>;
type Cached = {
  db?: Database;
};

const cache = globalThis as typeof globalThis & { __foodappDbCache?: Cached };
if (!cache.__foodappDbCache) {
  cache.__foodappDbCache = {};
}

function createDatabase() {
  const databaseUrl = requireEnv("DATABASE_URL");
  return drizzle(databaseUrl);
}

if (!cache.__foodappDbCache.db) {
  cache.__foodappDbCache.db = createDatabase();
}

export const db = cache.__foodappDbCache.db as Database;
