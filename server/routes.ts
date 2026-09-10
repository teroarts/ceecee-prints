import type { Express } from "express";
import { z } from "zod";
import type { IStorage } from "./storage-types";
import { insertOrderSchema } from "../shared/schema";
import {
  getProductById,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
} from "../shared/products";

/** Contact-form submissions are delivered to this inbox. */
const CONTACT_RECIPIENT = "schebet12@gmail.com";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

type OrderItem = { productId: string; size: string; quantity: number };

/** Registers the JSON API on an Express app. Storage is injected so the
 *  local server can use SQLite while serverless uses an in-memory store. */
export function registerRoutes(app: Express, storage: IStorage): void {
  app.post("/api/orders", async (req, res) => {
    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid order details", errors: parsed.error.issues });
    }

    let items: OrderItem[];
    try {
      items =
        typeof parsed.data.items === "string"
          ? (JSON.parse(parsed.data.items) as OrderItem[])
          : (parsed.data.items as unknown as OrderItem[]);
    } catch {
      return res.status(400).json({ message: "Invalid items payload" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Recompute totals server-side so prices can't be tampered with.
    let subtotal = 0;
    for (const item of items) {
      const product = getProductById(item.productId);
      if (!product || !product.inStock) {
        return res
          .status(400)
          .json({ message: `Unavailable product: ${item.productId}` });
      }
      const quantity = Math.max(1, Math.min(20, Math.floor(item.quantity)));
      subtotal += product.price * quantity;
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 90 + 10,
    )}`;

    const order = await storage.createOrder({
      ...parsed.data,
      items: JSON.stringify(items),
      orderNumber,
      subtotal,
      shipping,
      total: subtotal + shipping,
    });

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

    // Preferred path: Resend (requires RESEND_API_KEY env var).
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

    // Fallback: FormSubmit, which needs no API key but blocks some hosts.
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
}
