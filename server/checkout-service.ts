import type { Request } from "express";
import Stripe from "stripe";
import type { IStorage } from "./storage-types";
import type { OrderItemSnapshot, OrderRecord } from "./storage-types";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from "../shared/products";

export type CartItem = { productId: string; size: string; quantity: number };

export type CustomerDetails = {
  customerName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

let cachedClient: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripeClient(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cachedClient;
}

/** Absolute origin of the deployment, for Stripe success/cancel redirects. */
export function publicOrigin(req: Request): string {
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    (req.headers.host as string | undefined);
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5000";
}

/**
 * Validates cart items against the live catalog and rebuilds purchase-time
 * snapshots with server-side prices. Returns null (with a reason) when a
 * product is gone or stock is insufficient.
 */
export async function buildSnapshots(
  storage: IStorage,
  items: CartItem[],
): Promise<
  | { ok: true; snapshots: OrderItemSnapshot[]; subtotal: number }
  | { ok: false; reason: string }
> {
  const catalog = await storage.listProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const snapshots: OrderItemSnapshot[] = [];
  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.inStock || product.stock === 0) {
      return { ok: false, reason: `Unavailable product: ${item.productId}` };
    }
    const quantity = Math.max(1, Math.min(20, Math.floor(item.quantity)));
    if (product.stock != null && product.stock < quantity) {
      return {
        ok: false,
        reason: `Only ${product.stock} left of ${product.name}`,
      };
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
  return { ok: true, snapshots, subtotal };
}

/** "productId|size|qty;productId|size|qty" — compact for Stripe metadata. */
export function encodeItems(items: CartItem[]): string {
  return items
    .map((i) => `${i.productId}|${i.size}|${Math.floor(i.quantity)}`)
    .join(";");
}

export function decodeItems(encoded: string): CartItem[] {
  return encoded
    .split(";")
    .filter(Boolean)
    .map((chunk) => {
      const [productId, size, qty] = chunk.split("|");
      return {
        productId,
        size,
        quantity: Math.max(1, parseInt(qty, 10) || 1),
      };
    });
}

export async function createCheckoutSession(
  storage: IStorage,
  req: Request,
  customer: CustomerDetails,
  items: CartItem[],
): Promise<{ url: string } | { error: string; status: number }> {
  const stripe = getStripeClient();
  const built = await buildSnapshots(storage, items);
  if (!built.ok) return { error: built.reason, status: 400 };

  const subtotal = built.subtotal;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 90 + 10,
  )}`;

  const origin = publicOrigin(req);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customer.email,
    line_items: built.snapshots.map((snap) => ({
      quantity: snap.quantity,
      price_data: {
        currency: "usd",
        unit_amount: snap.unitPrice,
        product_data: {
          name:
            snap.size && snap.size !== "OS"
              ? `${snap.name} — ${snap.size}`
              : snap.name,
          ...(snap.image.startsWith("http")
            ? { images: [snap.image] }
            : {}),
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: shipping, currency: "usd" },
          display_name: shipping === 0 ? "Free shipping" : "Standard shipping",
        },
      },
    ],
    metadata: {
      orderNumber,
      customerName: customer.customerName,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      items: encodeItems(items),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
  });

  if (!session.url) return { error: "Stripe session has no URL", status: 502 };
  return { url: session.url };
}

export type ConfirmResult =
  | { status: "ok"; order: OrderRecord }
  | { status: "unpaid" }
  | { status: "error"; message: string };

/**
 * Verifies a Stripe Checkout session was paid and creates the order exactly
 * once (idempotent via the session id). Stock is decremented best-effort: a
 * customer who already paid always gets their order, even in the rare case
 * inventory sold out mid-checkout — the admin sees it and can refund.
 */
export async function confirmStripeSession(
  storage: IStorage,
  sessionId: string,
): Promise<ConfirmResult> {
  const stripe = getStripeClient();

  const existing = await storage.getOrderByStripeSession(sessionId);
  if (existing) return { status: "ok", order: existing };

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const md = session.metadata ?? {};
  const { orderNumber, email, customerName, address, city, state, zip } = md;
  if (!orderNumber || !email || !customerName || !address || !city || !state || !zip) {
    return { status: "error", message: "Session metadata incomplete" };
  }

  const items = decodeItems(md.items ?? "");
  if (items.length === 0) {
    return { status: "error", message: "Session has no items" };
  }

  // Rebuild snapshots from the live catalog. A product deleted mid-checkout
  // still appears on the order (paid for) with a zero price placeholder.
  const catalog = await storage.listProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const snapshots: OrderItemSnapshot[] = [];
  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (product) {
      subtotal += product.price * item.quantity;
      snapshots.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price,
        image: product.image,
      });
    } else {
      snapshots.push({
        productId: item.productId,
        slug: item.productId,
        name: item.productId,
        size: item.size,
        quantity: item.quantity,
        unitPrice: 0,
        image: "",
      });
    }
  }

  const soldOut = await storage.decrementStock(
    snapshots.map((s) => ({ productId: s.productId, quantity: s.quantity })),
  );
  if (soldOut) {
    console.warn(
      `[stripe] Order ${orderNumber} paid but ${soldOut} was sold out mid-checkout — order created for manual review.`,
    );
  }

  const order = await storage.createOrder({
    orderNumber,
    stripeSessionId: sessionId,
    paymentStatus: "paid",
    customerName,
    email,
    address,
    city,
    state,
    zip,
    items: JSON.stringify(snapshots),
    subtotal,
    shipping: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING,
    total: subtotal + (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING),
  });
  return { status: "ok", order };
}

/** Webhook handling: payload is only a hint — the session is always
 * re-fetched from Stripe before any order is written. */
export async function handleStripeWebhook(
  storage: IStorage,
  rawBody: unknown,
  signature: string | undefined,
): Promise<boolean> {
  const stripe = getStripeClient();
  let event: Stripe.Event;

  if (process.env.STRIPE_WEBHOOK_SECRET) {
    if (!signature || typeof rawBody !== "string" && !Buffer.isBuffer(rawBody)) {
      return false;
    }
    try {
      event = stripe.webhooks.constructEvent(
        rawBody as string | Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return false;
    }
  } else {
    try {
      const text =
        typeof rawBody === "string"
          ? rawBody
          : Buffer.isBuffer(rawBody)
            ? rawBody.toString("utf8")
            : JSON.stringify(rawBody);
      event = JSON.parse(text) as Stripe.Event;
    } catch {
      return false;
    }
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id) {
      await confirmStripeSession(storage, session.id).catch((error) => {
        console.error("[stripe] webhook confirm failed:", error);
      });
    }
  }
  return true;
}
