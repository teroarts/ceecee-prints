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
      paymentStatus: "unpaid",
      createdAt: new Date().toISOString(),
    };
    this.orders.set(record.orderNumber, record);
    return record;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | undefined> {
    return this.orders.get(orderNumber);
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

  async deleteProduct(id: string): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }
}
