import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { IStorage } from "./storage-types";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "./storage-types";
import type { OrderItemSnapshot, OrderStatusPatch } from "./storage-types";
import { orderInputSchema, productInputSchema } from "../shared/schema";
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
  TEE_SIZES,
  TEE_DETAILS,
} from "../shared/products";
import { dbConfigured, storageMode } from "./storage-resolve";
import {
  adminAuthConfigured,
  clearSessionCookie,
  isAdminRequest,
  passwordMatches,
  requireAdmin,
  setSessionCookie,
} from "./admin-auth";

/** Contact-form submissions are delivered to this inbox. */
const CONTACT_RECIPIENT = "schebet12@gmail.com";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

type CartItem = { productId: string; size: string; quantity: number };

/** Registers the JSON API on an Express app. Storage is injected so the
 *  local server and the serverless function can share these routes. */
export function registerRoutes(app: Express, storage: IStorage): void {
  /* ------------------------------ storefront ----------------------------- */

  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.listProducts();
      if (products.length === 0) {
        // Database configured but empty (before seeding) — keep the shop
        // browsable from the bundled seed catalog.
        const { products: seed } = await import("../shared/products");
        return res.json(seed);
      }
      res.json(products);
    } catch (error) {
      console.error("GET /api/products failed:", error);
      const { products: seed } = await import("../shared/products");
      res.json(seed);
    }
  });

  app.post("/api/orders", async (req, res) => {
    const parsed = orderInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid order details", errors: parsed.error.issues });
    }

    let items: CartItem[];
    try {
      items =
        typeof parsed.data.items === "string"
          ? (JSON.parse(parsed.data.items) as CartItem[])
          : (parsed.data.items as unknown as CartItem[]);
    } catch {
      return res.status(400).json({ message: "Invalid items payload" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Build purchase-time snapshots and recompute totals server-side so
    // prices can't be tampered with and history survives product edits.
    const catalog = await storage.listProducts();
    const byId = new Map(catalog.map((p) => [p.id, p]));

    let subtotal = 0;
    const snapshots: OrderItemSnapshot[] = [];
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product || !product.inStock || product.stock === 0) {
        return res
          .status(400)
          .json({ message: `Unavailable product: ${item.productId}` });
      }
      const quantity = Math.max(1, Math.min(20, Math.floor(item.quantity)));
      if (product.stock != null && product.stock < quantity) {
        return res.status(400).json({
          message: `Only ${product.stock} left of ${product.name}`,
        });
      }
      subtotal += product.price * quantity;
      snapshots.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: item.size,
        quantity,
        unitPrice: product.price,
        image: product.image,
      });
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 90 + 10,
    )}`;

    // Reserve inventory before writing the order; if a concurrent order
    // took the last unit, reject politely instead of overselling.
    const soldOut = await storage.decrementStock(
      snapshots.map((snap) => ({
        productId: snap.productId,
        quantity: snap.quantity,
      })),
    );
    if (soldOut) {
      return res.status(409).json({
        message: `${soldOut} just sold out — please adjust your cart`,
      });
    }

    let order;
    try {
      order = await storage.createOrder({
        ...parsed.data,
        items: JSON.stringify(snapshots),
        orderNumber,
        subtotal,
        shipping,
        total: subtotal + shipping,
      });
    } catch (error) {
      // Give the reserved units back if the order write fails.
      await storage.decrementStock(
        snapshots.map((snap) => ({
          productId: snap.productId,
          quantity: -snap.quantity,
        })),
      );
      throw error;
    }

    return res.status(201).json(order);
  });

  app.get("/api/orders/:orderNumber", async (req, res) => {
    const order = await storage.getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json(order);
  });

  app.post("/api/contact", async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid message details", errors: parsed.error.issues });
    }

    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.CONTACT_FROM || "CeeCee Prints <onboarding@resend.dev>",
            to: [CONTACT_RECIPIENT],
            reply_to: parsed.data.email,
            subject: `CeeCee Prints — new message from ${parsed.data.name}`,
            text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`,
          }),
        });
        if (!response.ok) {
          throw new Error(`Resend responded ${response.status}`);
        }
        return res.json({ sent: true });
      } catch (error) {
        console.error("Contact form delivery failed (Resend):", error);
        return res
          .status(502)
          .json({ message: "Could not send the message right now" });
      }
    }

    try {
      const response = await fetch(
        `https://formsubmit.co/ajax/${CONTACT_RECIPIENT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            ...parsed.data,
            _subject: `CeeCee Prints — new message from ${parsed.data.name}`,
            _template: "table",
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`FormSubmit responded ${response.status}`);
      }
      return res.json({ sent: true });
    } catch (error) {
      console.error("Contact form delivery failed:", error);
      return res
        .status(502)
        .json({ message: "Could not send the message right now" });
    }
  });

  /* -------------------------------- admin -------------------------------- */

  app.get("/api/admin/session", (req: Request, res: Response) => {
    res.json({
      authenticated: isAdminRequest(req),
      authConfigured: adminAuthConfigured(),
      dbConfigured: dbConfigured(),
      storageMode: storageMode(),
    });
  });

  app.post("/api/admin/login", async (req, res) => {
    const { password } = (req.body ?? {}) as { password?: string };
    if (!adminAuthConfigured()) {
      return res
        .status(503)
        .json({ message: "Admin access is not configured (set ADMIN_PASSWORD)" });
    }
    // Small delay blunts brute-force attempts.
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof password !== "string" || !passwordMatches(password)) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    setSessionCookie(res);
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const orders = await storage.listOrders(1000);
    const active = orders.filter((o) => o.orderStatus !== "cancelled");

    const revenue = active.reduce((sum, o) => sum + o.total, 0);
    const paid = active.filter((o) => o.paymentStatus === "paid");
    const paidRevenue = paid.reduce((sum, o) => sum + o.total, 0);
    const pendingCount = active.filter((o) => o.orderStatus === "pending").length;
    const fulfilledCount = active.filter(
      (o) => o.orderStatus === "fulfilled",
    ).length;
    const avgOrderValue = active.length
      ? Math.round(revenue / active.length)
      : 0;

    // Revenue by day for the last 30 days.
    const byDay = new Map<string, number>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const order of active) {
      const key = order.createdAt.slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + order.total);
    }
    const revenueByDay = Array.from(byDay.entries()).map(([date, cents]) => ({
      date,
      cents,
    }));

    // Top products from purchase-time snapshots (not the live catalog).
    const productTotals = new Map<string, { name: string; units: number; cents: number }>();
    for (const order of active) {
      let snapshots: OrderItemSnapshot[] = [];
      try {
        snapshots = JSON.parse(order.items) as OrderItemSnapshot[];
      } catch {
        continue;
      }
      for (const item of snapshots) {
        const entry = productTotals.get(item.productId) ?? {
          name: item.name,
          units: 0,
          cents: 0,
        };
        entry.units += item.quantity;
        entry.cents += item.unitPrice * item.quantity;
        productTotals.set(item.productId, entry);
      }
    }
    const topProducts = Array.from(productTotals.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    res.json({
      orderCount: orders.length,
      revenue,
      paidRevenue,
      avgOrderValue,
      pendingCount,
      fulfilledCount,
      cancelledCount: orders.length - active.length,
      revenueByDay,
      topProducts,
      recentOrders: orders.slice(0, 6),
      storageMode: storageMode(),
    });
  });

  app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    const orders = await storage.listOrders(500);
    res.json(orders);
  });

  const statusPatchSchema = z.object({
    orderStatus: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES as [string, ...string[]]).optional(),
  });

  app.patch("/api/admin/orders/:orderNumber", requireAdmin, async (req, res) => {
    const parsed = statusPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid status update" });
    }
    const patch = parsed.data as OrderStatusPatch;
    if (patch.orderStatus === undefined && patch.paymentStatus === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const updated = await storage.updateOrderStatus(
      String(req.params.orderNumber),
      patch,
    );
    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(updated);
  });

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    res.json(await storage.listProducts());
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid product", errors: parsed.error.issues });
    }
    try {
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (error: any) {
      if (String(error?.message || error).includes("duplicate key")) {
        return res
          .status(409)
          .json({ message: "A product with that slug already exists" });
      }
      throw error;
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const parsed = productInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid product", errors: parsed.error.issues });
    }
    const updated = await storage.updateProduct(String(req.params.id), parsed.data);
    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(updated);
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteProduct(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ ok: true });
  });
}

export { TEE_SIZES, TEE_DETAILS };
