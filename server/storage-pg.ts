import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Product } from "../shared/products";
import type { ProductInput } from "../shared/schema";
import { products as productsTable, orders as ordersTable } from "../shared/schema";
import type {
  IStorage,
  NewOrder,
  OrderRecord,
  OrderStatus,
  OrderStatusPatch,
  PaymentStatus,
} from "./storage-types";

type ProductRow = typeof productsTable.$inferSelect;
type OrderRow = typeof ordersTable.$inferSelect;

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image,
    category: row.category as Product["category"],
    sizes: JSON.parse(row.sizes) as string[],
    featured: row.featured,
    inStock: row.inStock,
    stock: row.stock ?? null,
    stockBySize: parseStockBySize(row.stockBySize),
    details: JSON.parse(row.details) as string[],
  };
}

function parseStockBySize(raw: string | null): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [size, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[size] = Math.floor(n);
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function rowToOrder(row: OrderRow): OrderRecord {
  return {
    ...row,
    orderStatus: row.orderStatus as OrderStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    ownerNotifiedAt: row.ownerNotifiedAt
      ? row.ownerNotifiedAt.toISOString()
      : null,
    shippedNotifiedAt: row.shippedNotifiedAt
      ? row.shippedNotifiedAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Postgres-backed storage. Uses postgres.js with a small pool: on serverless
 * every function instance holds its own pool, so keep it tiny and let idle
 * connections time out. Works with Neon (use the pooled connection string)
 * and any standard Postgres, including local dev.
 */
export class PostgresStorage implements IStorage {
  private sql = postgres(process.env.DATABASE_URL!, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: /sslmode=require/.test(process.env.DATABASE_URL!)
      ? "require"
      : undefined,
  });
  private db = drizzle(this.sql);

  async createOrder(order: NewOrder): Promise<OrderRecord> {
    const [row] = await this.db
      .insert(ordersTable)
      .values({
        ...order,
        ...(order.paymentStatus
          ? { paymentStatus: order.paymentStatus }
          : {}),
      })
      .returning();
    return rowToOrder(row);
  }

  async getOrderByStripeSession(
    sessionId: string,
  ): Promise<OrderRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.stripeSessionId, sessionId))
      .limit(1);
    return row ? rowToOrder(row) : undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1);
    return row ? rowToOrder(row) : undefined;
  }

  async listOrders(limit = 500): Promise<OrderRecord[]> {
    const rows = await this.db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit);
    return rows.map(rowToOrder);
  }

  async updateOrderStatus(
    orderNumber: string,
    patch: OrderStatusPatch,
  ): Promise<OrderRecord | undefined> {
    const [row] = await this.db
      .update(ordersTable)
      .set(patch)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .returning();
    return row ? rowToOrder(row) : undefined;
  }

  async markOwnerNotified(
    orderNumber: string,
  ): Promise<OrderRecord | undefined> {
    const [row] = await this.db
      .update(ordersTable)
      .set({ ownerNotifiedAt: new Date() })
      .where(
        and(
          eq(ordersTable.orderNumber, orderNumber),
          isNull(ordersTable.ownerNotifiedAt),
        ),
      )
      .returning();
    return row ? rowToOrder(row) : undefined;
  }

  async markShippedNotified(
    orderNumber: string,
  ): Promise<OrderRecord | undefined> {
    const [row] = await this.db
      .update(ordersTable)
      .set({ shippedNotifiedAt: new Date() })
      .where(
        and(
          eq(ordersTable.orderNumber, orderNumber),
          isNull(ordersTable.shippedNotifiedAt),
        ),
      )
      .returning();
    return row ? rowToOrder(row) : undefined;
  }

  async listProducts(): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(productsTable)
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));
    return rows.map(rowToProduct);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [row] = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    return row ? rowToProduct(row) : undefined;
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const slug = input.slug ?? slugify(input.name);
    const [row] = await this.db
      .insert(productsTable)
      .values({
        id: slug,
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        image: input.image,
        sizes: JSON.stringify(input.sizes),
        featured: input.featured,
        inStock: input.inStock,
        stock: input.stock ?? null,
        stockBySize: input.stockBySize != null ? JSON.stringify(input.stockBySize) : null,
        details: JSON.stringify(input.details),
        sortOrder: input.sortOrder,
      })
      .returning();
    return rowToProduct(row);
  }

  async updateProduct(
    id: string,
    patch: Partial<ProductInput>,
  ): Promise<Product | undefined> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.price !== undefined) values.price = patch.price;
    if (patch.category !== undefined) values.category = patch.category;
    if (patch.image !== undefined) values.image = patch.image;
    if (patch.sizes !== undefined) values.sizes = JSON.stringify(patch.sizes);
    if (patch.featured !== undefined) values.featured = patch.featured;
    if (patch.inStock !== undefined) values.inStock = patch.inStock;
    if (patch.stock !== undefined) values.stock = patch.stock;
    if (patch.stockBySize !== undefined)
      values.stockBySize =
        patch.stockBySize != null ? JSON.stringify(patch.stockBySize) : null;
    if (patch.details !== undefined)
      values.details = JSON.stringify(patch.details);
    if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;

    const [row] = await this.db
      .update(productsTable)
      .set(values)
      .where(eq(productsTable.id, id))
      .returning();
    return row ? rowToProduct(row) : undefined;
  }

  async decrementStock(
    items: { productId: string; size?: string; quantity: number }[],
  ): Promise<string | null> {
    // If any product comes up short, the earlier changes in this batch are
    // reversed so a multi-item order either reserves everything or nothing.
    const done: { productId: string; size?: string; quantity: number }[] = [];
    for (const { productId, size, quantity } of items) {
      const [row] = await this.sql`
        SELECT name, stock, stock_by_size FROM products
        WHERE id = ${productId}`.catch(() => []);
      // Missing products are skipped, not failed.
      if (!row) continue;

      if (row.stock_by_size != null) {
        // Per-size tracking: decrement the specific size with an optimistic
        // lock (the write only lands if the stored JSON is still the copy we
        // read), retrying a couple of times if another order raced us.
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          const current = row.stock_by_size;
          let map: Record<string, number>;
          try {
            map = JSON.parse(current) as Record<string, number>;
          } catch {
            map = {};
          }
          const available = map[size ?? ""] ?? 0;
          if (quantity > 0 && available < quantity) {
            const failedName = row.name;
            await this.reverseStock(done);
            return failedName;
          }
          const next = {
            ...map,
            [size ?? ""]: available - quantity,
          };
          const updated = await this.sql`
            UPDATE products SET stock_by_size = ${JSON.stringify(next)}, updated_at = now()
            WHERE id = ${productId} AND stock_by_size = ${current}
            RETURNING name`.catch(() => []);
          if (updated.length > 0) {
            ok = true;
            break;
          }
          // Lost the race — re-read and try again.
          const [fresh] = await this.sql`
            SELECT stock_by_size FROM products WHERE id = ${productId}`;
          if (fresh) row.stock_by_size = fresh.stock_by_size;
        }
        if (!ok) {
          const failedName = row.name;
          await this.reverseStock(done);
          return failedName;
        }
        done.push({ productId, size, quantity });
        continue;
      }

      // Legacy total-stock tracking.
      const [updated] = await this.sql`
        UPDATE products SET stock = stock - ${quantity}, updated_at = now()
        WHERE id = ${productId} AND stock IS NOT NULL AND stock >= ${quantity}
        RETURNING name`.catch(() => []);
      if (!updated) {
        const [existing] = await this.sql`
          SELECT name, stock FROM products WHERE id = ${productId}`;
        // Untracked (NULL) or missing products are skipped, not failed.
        if (!existing || existing.stock == null) continue;
        const failedName = existing.name;
        await this.reverseStock(done);
        return failedName;
      }
      done.push({ productId, size, quantity });
    }
    return null;
  }

  /** Adds reserved units back after a failed multi-item reservation. */
  private async reverseStock(
    done: { productId: string; size?: string; quantity: number }[],
  ): Promise<void> {
    for (const d of done) {
      if (d.size != null) {
        const [row] = await this.sql`
          SELECT stock_by_size FROM products WHERE id = ${d.productId}`;
        if (!row || row.stock_by_size == null) continue;
        try {
          const map = JSON.parse(row.stock_by_size) as Record<string, number>;
          map[d.size] = (map[d.size] ?? 0) + d.quantity;
          await this.sql`
            UPDATE products SET stock_by_size = ${JSON.stringify(map)}, updated_at = now()
            WHERE id = ${d.productId}`;
        } catch {
          // ignore malformed JSON — nothing sensible to restore
        }
      } else {
        await this.sql`
          UPDATE products SET stock = stock + ${d.quantity}
          WHERE id = ${d.productId}`;
      }
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning({ id: productsTable.id });
    return rows.length > 0;
  }
}
