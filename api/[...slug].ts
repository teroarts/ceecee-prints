import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { MemoryStorage } from "../server/storage-memory";

/**
 * Vercel serverless entry point. This catch-all function receives every
 * `/api/*` request with the original URL intact, so the Express router
 * matches the same paths it does when running locally.
 */
const storage = new MemoryStorage();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

registerRoutes(app, storage);

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
