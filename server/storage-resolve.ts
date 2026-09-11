import type { IStorage } from "./storage-types";
import { MemoryStorage } from "./storage-memory";

/**
 * Picks an order store at startup.
 *
 * - Postgres when DATABASE_URL is set (production mode — orders and product
 *   edits persist).
 * - In-memory otherwise (demo mode — the storefront still works using the
 *   seed catalog, but nothing persists).
 *
 * If the database is configured but unreachable at boot, we fall back to
 * in-memory so the storefront stays up and the admin dashboard shows its
 * "database not configured / unreachable" state.
 */
export type StorageMode = "postgres" | "memory";

let resolved: IStorage | null = null;
let mode: StorageMode = "memory";

export async function resolveStorage(): Promise<IStorage> {
  if (resolved) return resolved;

  if (process.env.DATABASE_URL) {
    try {
      const { PostgresStorage } = await import("./storage-pg");
      // Verify connectivity before committing to Postgres.
      const candidate = new PostgresStorage();
      await candidate.listProducts();
      resolved = candidate;
      mode = "postgres";
      return resolved;
    } catch (error) {
      console.error(
        "Postgres storage unavailable — falling back to in-memory:",
        error,
      );
    }
  }

  resolved = new MemoryStorage();
  mode = "memory";
  return resolved;
}

export function storageMode(): StorageMode {
  return mode;
}

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
