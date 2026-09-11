import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { mkdir, rm } from "node:fs/promises";

/**
 * Vercel build.
 *
 * 1. Builds the client into `dist/public` (served as static assets).
 * 2. Bundles the Express API into `api/index.mjs`.
 *
 * The API is bundled rather than deployed as source because Vercel's Node
 * builder compiles each file under `api/` on its own and does not follow
 * relative imports into `server/` or `shared/`. `vercel.json` rewrites all
 * /api/* paths to this single function (Vercel's [...slug] catch-alls only
 * match one path segment outside Next.js).
 */

// ESM output needs CJS interop shims — some bundled dependencies reference
// `require`, `__filename` and `__dirname`.
const banner = `import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);`;

async function buildAll() {
  console.log("building client...");
  await viteBuild();

  console.log("bundling serverless api...");
  await rm("api", { recursive: true, force: true });
  await mkdir("api", { recursive: true });

  await esbuild({
    entryPoints: ["server/vercel-entry.ts"],
    outfile: "api/index.mjs",
    platform: "node",
    target: "node20",
    format: "esm",
    bundle: true,
    banner: { js: banner },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
