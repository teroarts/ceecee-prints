import {
  pgTable,
  text,
  integer,
  boolean,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { TEE_SIZES, TEE_DETAILS } from "./products";

/** Product catalog. Images may be relative paths (bundled assets) or URLs. */
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  /** Price in cents */
  price: integer("price").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  /** JSON-encoded array of size strings */
  sizes: text("sizes").notNull(),
  featured: boolean("featured").notNull().default(false),
  inStock: boolean("in_stock").notNull().default(true),
  /** JSON-encoded array of detail bullet strings */
  details: text("details").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  /** JSON-encoded array of purchase-time item snapshots (name, price, image) */
  items: text("items").notNull(),
  /** All money fields in cents */
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  /** pending | fulfilled | cancelled */
  orderStatus: text("order_status").notNull().default("pending"),
  /** unpaid | paid | refunded */
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------- zod inputs ------------------------------- */

export const productInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers, hyphens")
    .max(80)
    .optional(),
  description: z.string().min(10).max(2000),
  /** cents */
  price: z.number().int().min(100).max(1_000_000),
  category: z.string().min(2).max(60),
  image: z.string().min(1).max(500),
  sizes: z.array(z.string().min(1)).default(TEE_SIZES),
  featured: z.boolean().default(false),
  inStock: z.boolean().default(true),
  details: z.array(z.string().min(1)).default(TEE_DETAILS),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const orderInputSchema = z.object({
  customerName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(120),
  state: z.string().min(2).max(60),
  zip: z.string().min(3).max(20),
  /** JSON-encoded array of { productId, size, quantity } */
  items: z.string(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

/** Snapshot of a purchased item, stored with the order so history stays
 *  correct even if the product is later edited or deleted. */
export type OrderItemSnapshot = {
  productId: string;
  slug: string;
  name: string;
  size: string;
  quantity: number;
  /** unit price in cents at purchase time */
  unitPrice: number;
  image: string;
};
