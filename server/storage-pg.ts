import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { asc, desc, eq } from "drizzle-orm";
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
    details: JSON.parse(row.details) as string[],
  };
}

function rowToOrder(row: OrderRow): OrderRecord {
  return {
    ...row,
    orderStatus: row.orderStatus as OrderStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
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
      .values(order)
      .returning();
    return rowToOrder(row);
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
    items: { productId: string; quantity: number }[],
  ): Promise<string | null> {
    // Merge quantities per product, then decrement with a floor guard so a
    // race between two orders can never push stock negative. If any product
    // comes up short, the earlier decrements in this batch are reversed.
    const totals = new Map<string, number>();
    for (const { productId, quantity } of items) {
      totals.set(productId, (totals.get(productId) ?? 0) + quantity);
    }
    const done: { productId: string; quantity: number }[] = [];
    for (const [productId, quantity] of Array.from(totals.entries())) {
      const [row] = await this.sql`
        UPDATE products SET stock = stock - ${quantity}, updated_at = now()
        WHERE id = ${productId} AND stock IS NOT NULL AND stock >= ${quantity}
        RETURNING name`.catch(() => []);
      if (!row) {
        const [existing] = await this.sql`
          SELECT name, stock FROM products WHERE id = ${productId}`;
        // Untracked (NULL) or missing products are skipped, not failed.
        if (!existing || existing.stock == null) continue;
        const failedName = existing.name;
        for (const d of done) {
          await this.sql`
            UPDATE products SET stock = stock + ${d.quantity}
            WHERE id = ${d.productId}`;
        }
        return failedName;
      }
      done.push({ productId, quantity });
    }
    return null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning({ id: productsTable.id });
    return rows.length > 0;
  }
}
