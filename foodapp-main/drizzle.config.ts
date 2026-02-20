import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for Drizzle.");
}

export default defineConfig({
  dialect: "mysql",
  schema: "./lib/db/menu-schema.ts",
  out: "./db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
