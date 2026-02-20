import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test(".env.example includes DATABASE_URL", () => {
  const envTemplate = readFileSync(".env.example", "utf8");
  assert.match(envTemplate, /DATABASE_URL=/);
});
