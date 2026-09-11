import type { Product } from "../shared/products";
import type { OrderItemSnapshot, ProductInput } from "../shared/schema";

export type OrderStatus = "pending" | "fulfilled" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "fulfilled",
  "cancelled",
];
export const PAYMENT_STATUSES: PaymentStatus[] = [
  "unpaid",
  "paid",
  "refunded",
];

export type OrderRecord = {
  id: number;
  orderNumber: string;
  customerName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: string;
  subtotal: number;
  shipping: number;
  total: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  /** ISO timestamp */
  createdAt: string;
};

export type NewOrder = {
  orderNumber: string;
  customerName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: string;
  subtotal: number;
  shipping: number;
  total: number;
};

export type OrderStatusPatch = {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

/**
 * Everything the storefront and the admin dashboard need from a backing
 * store. Two implementations exist: Postgres (production) and in-memory
 * (demo mode when DATABASE_URL is not configured).
 */
export interface IStorage {
  // orders
  createOrder(order: NewOrder): Promise<OrderRecord>;
  getOrderByNumber(orderNumber: string): Promise<OrderRecord | undefined>;
  listOrders(limit?: number): Promise<OrderRecord[]>;
  updateOrderStatus(
    orderNumber: string,
    patch: OrderStatusPatch,
  ): Promise<OrderRecord | undefined>;

  // products
  /**
   * Decrements tracked stock for the given items. Returns the name of the
   * first product that could not be fulfilled (insufficient stock), or null
   * on success. Untracked products (stock = null) are skipped.
   */
  decrementStock(
    items: { productId: string; quantity: number }[],
  ): Promise<string | null>;
  listProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(
    id: string,
    patch: Partial<ProductInput>,
  ): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
}

export type { OrderItemSnapshot, ProductInput };
