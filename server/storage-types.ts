import type { Order, NewOrder } from "../shared/schema";

export interface IStorage {
  createOrder(order: NewOrder): Promise<Order>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
}
