import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { z } from "zod";
import { storage } from "./storage";
import { insertOrderSchema } from "@shared/schema";
import {
  getProductById,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
} from "@shared/products";

/** Contact-form submissions are delivered to this inbox via FormSubmit. */
const CONTACT_RECIPIENT = "schebet12@gmail.com";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

type OrderItem = { productId: string; size: string; quantity: number };

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
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

  return httpServer;
}
