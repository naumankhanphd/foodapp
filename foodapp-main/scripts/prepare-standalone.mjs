import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const distDir = process.env.NEXT_DIST_DIR ?? ".next-local";
const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, distDir, "standalone");
const staticSourceDir = path.join(rootDir, distDir, "static");
const staticTargetDir = path.join(standaloneDir, distDir, "static");
const publicSourceDir = path.join(rootDir, "public");
const publicTargetDir = path.join(standaloneDir, "public");

async function ensurePathExists(targetPath, label) {
  try {
    await stat(targetPath);
  } catch (error) {
    throw new Error(`${label} not found: ${targetPath}`, { cause: error });
  }
}

await ensurePathExists(standaloneDir, "Standalone output");
await ensurePathExists(staticSourceDir, "Build static assets");
await ensurePathExists(publicSourceDir, "Public assets");

await mkdir(staticTargetDir, { recursive: true });
await mkdir(publicTargetDir, { recursive: true });

await cp(staticSourceDir, staticTargetDir, { recursive: true, force: true });
await cp(publicSourceDir, publicTargetDir, { recursive: true, force: true });

console.log(
  `Standalone assets prepared in ${path.relative(rootDir, standaloneDir) || "."}`
);
