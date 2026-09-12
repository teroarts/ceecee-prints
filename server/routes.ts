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
  buildSnapshots,
  createCheckoutSession,
  confirmStripeSession,
  handleStripeWebhook,
  stripeEnabled,
} from "./checkout-service";
import {
  sendContactMessage,
  sendOrderNotification,
  sendShippedEmail,
} from "./mailer";
import {
  adminAuthConfigured,
  clearSessionCookie,
  isAdminRequest,
  passwordMatches,
  requireAdmin,
  setSessionCookie,
} from "./admin-auth";

/** Contact-form submissions are delivered to this inbox. */
const CONTACT_RECIPIENT = "printsbyceecee@gmail.com";

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
    // buildSnapshots also enforces per-size stock limits.
    const built = await buildSnapshots(storage, items);
    if (!built.ok) {
      return res.status(400).json({ message: built.reason });
    }
    const snapshots = built.snapshots;
    const subtotal = built.subtotal;

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 90 + 10,
    )}`;

    // Reserve inventory before writing the order; if a concurrent order
    // took the last unit, reject politely instead of overselling.
    const soldOut = await storage.decrementStock(
      snapshots.map((snap) => ({
        productId: snap.productId,
        size: snap.size,
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
          size: snap.size,
          quantity: -snap.quantity,
        })),
      );
      throw error;
    }

    // Best-effort owner notification (exactly once per order).
    const notify = await storage.markOwnerNotified(orderNumber);
    if (notify) {
      await sendOrderNotification(order).catch(() => false);
    }

    return res.status(201).json(order);
  });

  /* ---------------------------- stripe checkout --------------------------- */

  // Lets the client know whether card payments are available, so the
  // checkout form can pick the right submit flow.
  app.get("/api/checkout/config", (_req, res) => {
    res.json({ enabled: stripeEnabled() });
  });

  app.post("/api/checkout", async (req, res) => {
    if (!stripeEnabled()) {
      return res
        .status(503)
        .json({ message: "Card payments are not configured" });
    }
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
    try {
      const result = await createCheckoutSession(storage, req, parsed.data, items);
      if ("error" in result) {
        return res.status(result.status).json({ message: result.error });
      }
      return res.json({ url: result.url });
    } catch (error) {
      console.error("POST /api/checkout failed:", error);
      return res
        .status(500)
        .json({ message: "Could not start checkout — please try again" });
    }
  });

  // Called by the success page after Stripe redirects back. Creates the
  // order only once the session is verified as paid.
  app.post("/api/checkout/confirm", async (req, res) => {
    if (!stripeEnabled()) {
      return res
        .status(503)
        .json({ message: "Card payments are not configured" });
    }
    const sessionId = req.body?.sessionId;
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      return res.status(400).json({ message: "Missing session id" });
    }
    try {
      const result = await confirmStripeSession(storage, sessionId);
      if (result.status === "unpaid") {
        return res.status(402).json({ message: "Payment not completed" });
      }
      if (result.status === "error") {
        return res.status(400).json({ message: result.message });
      }
      return res.json(result.order);
    } catch (error) {
      console.error("POST /api/checkout/confirm failed:", error);
      return res
        .status(500)
        .json({ message: "Could not verify your payment" });
    }
  });

  // Backup path for customers who never return from Stripe. The payload is
  // treated as a hint only — the session is re-fetched from Stripe before
  // an order is created, so unauthenticated calls can't forge anything.
  app.post("/api/webhooks/stripe", async (req, res) => {
    if (!stripeEnabled()) {
      return res.status(503).json({ message: "Not configured" });
    }
    const ok = await handleStripeWebhook(
      storage,
      (req as { rawBody?: unknown }).rawBody ?? req.body,
      req.headers["stripe-signature"] as string | undefined,
    );
    if (!ok) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }
    return res.json({ received: true });
  });

  app.get("/api/orders/:orderNumber", async (req, res) => {
    const order = await storage.getOrderByNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json(order);
  });

  const trackSchema = z.object({
    orderNumber: z.string().min(4).max(40),
    email: z.string().email(),
  });

  // Customer-facing order tracking. Requires both the order number and the
  // email used at checkout, and returns a sanitized view (no address).
  app.post("/api/orders/track", async (req, res) => {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Enter your order number and email" });
    }
    const order = await storage.getOrderByNumber(
      parsed.data.orderNumber.trim().toUpperCase(),
    );
    if (!order || order.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
      return res.status(404).json({
        message: "No order found for that order number and email",
      });
    }
    let items: OrderItemSnapshot[] = [];
    try {
      items = JSON.parse(order.items) as OrderItemSnapshot[];
    } catch {
      items = [];
    }
    return res.json({
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      carrier: order.carrier ?? null,
      trackingNumber: order.trackingNumber ?? null,
      createdAt: order.createdAt,
      items: items.map((i) => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
      })),
      total: order.total,
      shipping: order.shipping,
    });
  });

  app.post("/api/contact", async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid message details", errors: parsed.error.issues });
    }

    // Preferred path: Gmail SMTP straight to the store inbox.
    const sent = await sendContactMessage(parsed.data).catch(() => false);
    if (sent) {
      return res.json({ sent: true });
    }

    // Fallback when SMTP is not configured: FormSubmit relay.
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
    const pendingCount = active.filter(
      (o) => o.orderStatus === "pending" || o.orderStatus === "processing",
    ).length;
    const fulfilledCount = active.filter(
      (o) => o.orderStatus === "fulfilled" || o.orderStatus === "delivered",
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
    carrier: z.string().trim().max(60).nullable().optional(),
    trackingNumber: z.string().trim().max(80).nullable().optional(),
  });

  app.patch("/api/admin/orders/:orderNumber", requireAdmin, async (req, res) => {
    const parsed = statusPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid status update" });
    }
    const patch = parsed.data as OrderStatusPatch;
    if (
      patch.orderStatus === undefined &&
      patch.paymentStatus === undefined &&
      patch.carrier === undefined &&
      patch.trackingNumber === undefined
    ) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const updated = await storage.updateOrderStatus(
      String(req.params.orderNumber),
      patch,
    );
    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    // When an order is marked shipped, email the customer exactly once
    // with the carrier and tracking details (if any were provided).
    if (updated.orderStatus === "shipped") {
      const notify = await storage.markShippedNotified(updated.orderNumber);
      if (notify) {
        await sendShippedEmail(updated).catch(() => false);
      }
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
