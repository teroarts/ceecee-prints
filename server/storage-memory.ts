import type { Product } from "../shared/products";
import { products as seedProducts } from "../shared/products";
import type { ProductInput } from "../shared/schema";
import type {
  IStorage,
  NewOrder,
  OrderRecord,
  OrderStatusPatch,
} from "./storage-types";

/**
 * In-memory store used when DATABASE_URL is not configured (demo mode) or
 * when the database is unreachable at boot. Orders and product edits live
 * only for the lifetime of the process/instance.
 */
export class MemoryStorage implements IStorage {
  private products: Product[];
  private orders = new Map<string, OrderRecord>();
  private nextOrderId = 1;

  constructor() {
    this.products = seedProducts.map((p) => ({ ...p }));
  }

  async createOrder(order: NewOrder): Promise<OrderRecord> {
    const record: OrderRecord = {
      id: this.nextOrderId++,
      ...order,
      orderStatus: "pending",
      paymentStatus: order.paymentStatus ?? "unpaid",
      createdAt: new Date().toISOString(),
    };
    this.orders.set(record.orderNumber, record);
    return record;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | undefined> {
    return this.orders.get(orderNumber);
  }

  async getOrderByStripeSession(
    sessionId: string,
  ): Promise<OrderRecord | undefined> {
    return Array.from(this.orders.values()).find(
      (o) => o.stripeSessionId === sessionId,
    );
  }

  async listOrders(limit = 500): Promise<OrderRecord[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  }

  async updateOrderStatus(
    orderNumber: string,
    patch: OrderStatusPatch,
  ): Promise<OrderRecord | undefined> {
    const existing = this.orders.get(orderNumber);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.orders.set(orderNumber, updated);
    return updated;
  }

  async markOwnerNotified(
    orderNumber: string,
  ): Promise<OrderRecord | undefined> {
    const existing = this.orders.get(orderNumber);
    if (!existing || existing.ownerNotifiedAt) return undefined;
    const updated = { ...existing, ownerNotifiedAt: new Date().toISOString() };
    this.orders.set(orderNumber, updated);
    return updated;
  }

  async markShippedNotified(
    orderNumber: string,
  ): Promise<OrderRecord | undefined> {
    const existing = this.orders.get(orderNumber);
    if (!existing || existing.shippedNotifiedAt) return undefined;
    const updated = { ...existing, shippedNotifiedAt: new Date().toISOString() };
    this.orders.set(orderNumber, updated);
    return updated;
  }

  async listProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.find((p) => p.id === id);
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const slug =
      input.slug ??
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const product: Product & { sortOrder: number } = {
      id: slug,
      slug,
      name: input.name,
      description: input.description,
      price: input.price,
      image: input.image,
      category: input.category as Product["category"],
      sizes: input.sizes,
      featured: input.featured,
      inStock: input.inStock,
      stock: input.stock ?? null,
      stockBySize: input.stockBySize ?? null,
      details: input.details,
      sortOrder: input.sortOrder,
    };
    this.products.push(product);
    return product;
  }

  async updateProduct(
    id: string,
    patch: Partial<ProductInput>,
  ): Promise<Product | undefined> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const current = this.products[index];
    const updated: Product = {
      ...current,
      ...patch,
      category: (patch.category ?? current.category) as Product["category"],
    };
    this.products[index] = updated;
    return updated;
  }

  async decrementStock(
    items: { productId: string; size?: string; quantity: number }[],
  ): Promise<string | null> {
    const done: {
      product: Product;
      size?: string;
      quantity: number;
    }[] = [];
    for (const { productId, size, quantity } of items) {
      const product = this.products.find((p) => p.id === productId);
      if (!product) continue;
      if (product.stockBySize != null) {
        const available = product.stockBySize[size ?? ""] ?? 0;
        if (quantity > 0 && available < quantity) {
          this.reverseMemoryStock(done);
          return product.name;
        }
        product.stockBySize = {
          ...product.stockBySize,
          [size ?? ""]: available - quantity,
        };
        done.push({ product, size, quantity });
        continue;
      }
      if (
        product.stock != null &&
        (quantity > 0 ? product.stock < quantity : false)
      ) {
        this.reverseMemoryStock(done);
        return product.name;
      }
      if (product.stock != null) {
        product.stock -= quantity;
        done.push({ product, size: undefined, quantity });
      }
    }
    return null;
  }

  private reverseMemoryStock(
    done: { product: Product; size?: string; quantity: number }[],
  ): void {
    for (const d of done) {
      if (d.size != null && d.product.stockBySize != null) {
        d.product.stockBySize = {
          ...d.product.stockBySize,
          [d.size]: (d.product.stockBySize[d.size] ?? 0) + d.quantity,
        };
      } else if (d.product.stock != null) {
        d.product.stock += d.quantity;
      }
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }
}
