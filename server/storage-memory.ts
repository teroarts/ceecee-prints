import type { Order, NewOrder } from "../shared/schema";
import type { IStorage } from "./storage-types";

/**
 * In-memory order store for serverless platforms (Vercel) where the
 * filesystem is ephemeral and native SQLite bindings are unavailable.
 *
 * Orders live for the lifetime of the function instance only. The checkout
 * flow seeds the client cache with the created order, so the confirmation
 * page renders correctly even when a later request hits a cold instance.
 */
export class MemoryStorage implements IStorage {
  private byNumber = new Map<string, Order>();
  private nextId = 1;

  async createOrder(order: NewOrder): Promise<Order> {
    const row = { id: this.nextId++, ...order } as Order;
    this.byNumber.set(row.orderNumber, row);
    return row;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.byNumber.get(orderNumber);
  }
}
