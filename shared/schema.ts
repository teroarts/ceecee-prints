import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  /** JSON-encoded array of { productId, size, quantity } */
  items: text("items").notNull(),
  /** All money fields in cents */
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  subtotal: true,
  shipping: true,
  total: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
/** Full row written to the database — totals are computed server-side. */
export type NewOrder = InsertOrder & {
  orderNumber: string;
  subtotal: number;
  shipping: number;
  total: number;
};
export type Order = typeof orders.$inferSelect;
