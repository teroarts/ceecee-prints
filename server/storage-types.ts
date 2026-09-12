import type { Product } from "../shared/products";
import type { OrderItemSnapshot, ProductInput } from "../shared/schema";

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "fulfilled"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
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
  carrier?: string | null;
  trackingNumber?: string | null;
  ownerNotifiedAt?: string | null;
  shippedNotifiedAt?: string | null;
  stripeSessionId?: string | null;
  /** ISO timestamp */
  createdAt: string;
};

export type NewOrder = {
  orderNumber: string;
  /** Set for orders created by a completed Stripe Checkout session */
  stripeSessionId?: string;
  paymentStatus?: PaymentStatus;
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
  carrier?: string | null;
  trackingNumber?: string | null;
};

/**
 * Everything the storefront and the admin dashboard need from a backing
 * store. Two implementations exist: Postgres (production) and in-memory
 * (demo mode when DATABASE_URL is not configured).
 */
export interface IStorage {
  // orders
  createOrder(order: NewOrder): Promise<OrderRecord>;
  getOrderByStripeSession(
    sessionId: string,
  ): Promise<OrderRecord | undefined>;
  getOrderByNumber(orderNumber: string): Promise<OrderRecord | undefined>;
  listOrders(limit?: number): Promise<OrderRecord[]>;
  updateOrderStatus(
    orderNumber: string,
    patch: OrderStatusPatch,
  ): Promise<OrderRecord | undefined>;
  /**
   * Marks the owner notification as sent exactly once. Returns the order
   * only for the caller that won the race (first call) — later calls get
   * undefined, so the email is never sent twice.
   */
  markOwnerNotified(orderNumber: string): Promise<OrderRecord | undefined>;
  /** Same one-shot guard for the customer "your order has shipped" email. */
  markShippedNotified(orderNumber: string): Promise<OrderRecord | undefined>;

  // products
  /**
   * Decrements tracked stock for the given items. Returns the name of the
   * first product that could not be fulfilled (insufficient stock), or null
   * on success. Untracked products (stock = null) are skipped. Products with
   * per-size tracking decrement the specific size; negative quantities add
   * stock back (used to reverse reservations).
   */
  decrementStock(
    items: { productId: string; size?: string; quantity: number }[],
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
