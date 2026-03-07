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

function getDatabase(): Database {
  if (!cache.__foodappDbCache?.db) {
    cache.__foodappDbCache = cache.__foodappDbCache || {};
    cache.__foodappDbCache.db = createDatabase();
  }
  return cache.__foodappDbCache.db;
}

// Keep the existing `db` import surface while delaying DB/env resolution
// until the first query access.
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDatabase() as unknown as object;
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
}) as Database;

export { getDatabase };
