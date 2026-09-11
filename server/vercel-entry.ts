import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { resolveStorage, storageMode } from "./storage-resolve";

/**
 * Serverless entry point (Vercel).
 *
 * This module is bundled by `script/build-vercel.ts` into
 * `api/index.mjs` — a single self-contained file. Vercel's Node builder
 * compiles each file under `api/` in isolation and does not trace imports
 * outside `api/`, so the bundle must carry its own dependencies.
 *
 * Storage: uses Postgres when DATABASE_URL is set (see storage-resolve),
 * otherwise falls back to in-memory demo data. `vercel.json` rewrites every
 * /api/* path here because Vercel's dynamic segment routing only matches a
 * single path segment for non-Next.js projects.
 */
const storage = await resolveStorage();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

registerRoutes(app, storage);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: storageMode(), node: process.version });
});

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({ message });
});

export default app;
