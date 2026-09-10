import type { IStorage } from "./storage-types";
import { MemoryStorage } from "./storage-memory";

/**
 * Picks an order store at startup.
 *
 * SQLite is preferred for local/self-hosted runs because orders survive a
 * restart. Some hosts can't load the native better-sqlite3 binding (or have a
 * read-only filesystem), so we degrade to an in-memory store instead of
 * crashing the whole server on boot.
 *
 * Set STORAGE=memory to force the in-memory store.
 */
export async function resolveStorage(): Promise<IStorage> {
  if (process.env.STORAGE === "memory") {
    return new MemoryStorage();
  }

  try {
    const { DatabaseStorage } = await import("./storage");
    return new DatabaseStorage();
  } catch (error) {
    console.error(
      "SQLite storage unavailable — falling back to in-memory orders:",
      error,
    );
    return new MemoryStorage();
  }
}
