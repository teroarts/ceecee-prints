import { orders } from "../shared/schema";
import type { Order, NewOrder } from "../shared/schema";
import type { IStorage } from "./storage-types";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export class DatabaseStorage implements IStorage {
  async createOrder(order: NewOrder): Promise<Order> {
    return db.insert(orders).values(order).returning().get();
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .get();
  }
}

export const storage = new DatabaseStorage();
