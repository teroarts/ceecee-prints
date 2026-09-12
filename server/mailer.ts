import nodemailer, { type Transporter } from "nodemailer";
import type { OrderItemSnapshot } from "../shared/schema";
import type { OrderRecord } from "./storage-types";

/**
 * Gmail SMTP mailer for store notifications. Everything degrades gracefully:
 * when SMTP is not configured (SMTP_USER/SMTP_PASS unset) the send functions
 * return false and callers treat email as best-effort — checkout and admin
 * actions never fail because of an email problem.
 */

let cachedTransport: Transporter | null = null;

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport(): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || "true") !== "false",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }
  return cachedTransport;
}

function mailFrom(): string {
  return (
    process.env.MAIL_FROM ||
    `CeeCee Prints <${process.env.SMTP_USER || "printsbyceecee@gmail.com"}>`
  );
}

/** Absolute site URL for links inside emails. */
export function siteUrl(): string {
  return process.env.SITE_URL || "https://www.ceeceeprints.com";
}

export function ownerInbox(): string {
  return process.env.ORDER_NOTIFY_TO || "printsbyceecee@gmail.com";
}

export function contactInbox(): string {
  return process.env.CONTACT_TO || "printsbyceecee@gmail.com";
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseItems(order: OrderRecord): OrderItemSnapshot[] {
  try {
    return JSON.parse(order.items) as OrderItemSnapshot[];
  } catch {
    return [];
  }
}

/** Owner notification: "you have a new order". */
export async function sendOrderNotification(
  order: OrderRecord,
): Promise<boolean> {
  if (!mailerConfigured()) {
    console.log(
      `[mail] SMTP not configured — skipping order notification for ${order.orderNumber}`,
    );
    return false;
  }
  const items = parseItems(order);
  const lines = items
    .map(
      (i) =>
        `  • ${i.quantity} × ${i.name}${i.size && i.size !== "OS" ? ` (size ${i.size})` : ""} — ${formatPrice(i.unitPrice * i.quantity)}`,
    )
    .join("\n");
  try {
    await getTransport().sendMail({
      from: mailFrom(),
      to: ownerInbox(),
      replyTo: order.email,
      subject: `New order ${order.orderNumber} — ${formatPrice(order.total)} (${order.paymentStatus})`,
      text: [
        `New order ${order.orderNumber}`,
        ``,
        `Customer: ${order.customerName} <${order.email}>`,
        `Ship to: ${order.address}, ${order.city}, ${order.state} ${order.zip}`,
        `Payment: ${order.paymentStatus}`,
        ``,
        `Items:`,
        lines,
        ``,
        `Subtotal: ${formatPrice(order.subtotal)}`,
        `Shipping: ${order.shipping === 0 ? "Free" : formatPrice(order.shipping)}`,
        `Total: ${formatPrice(order.total)}`,
        ``,
        `Manage it in the admin dashboard: ${siteUrl()}/admin/orders`,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error(
      `[mail] order notification for ${order.orderNumber} failed:`,
      error,
    );
    return false;
  }
}

/** Customer notification: "your order has shipped". */
export async function sendShippedEmail(order: OrderRecord): Promise<boolean> {
  if (!mailerConfigured()) {
    console.log(
      `[mail] SMTP not configured — skipping shipped email for ${order.orderNumber}`,
    );
    return false;
  }
  const items = parseItems(order);
  const lines = items
    .map(
      (i) =>
        `  • ${i.quantity} × ${i.name}${i.size && i.size !== "OS" ? ` (size ${i.size})` : ""}`,
    )
    .join("\n");
  const tracking = order.trackingNumber
    ? [
        ``,
        `Carrier: ${order.carrier || "—"}`,
        `Tracking number: ${order.trackingNumber}`,
      ].join("\n")
    : "";
  try {
    await getTransport().sendMail({
      from: mailFrom(),
      to: order.email,
      subject: `Your CeeCee Prints order ${order.orderNumber} has shipped`,
      text: [
        `Hi ${order.customerName},`,
        ``,
        `Good news — your order is on its way!`,
        ``,
        `Order: ${order.orderNumber}`,
        `Items:`,
        lines,
        tracking,
        ``,
        `You can check the latest status any time on the tracking page: ${siteUrl()}/track`,
        ``,
        `Thank you for supporting CeeCee Prints!`,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error(`[mail] shipped email for ${order.orderNumber} failed:`, error);
    return false;
  }
}

/** Contact-form message from a site visitor. */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  if (!mailerConfigured()) {
    console.log("[mail] SMTP not configured — skipping contact message");
    return false;
  }
  try {
    await getTransport().sendMail({
      from: mailFrom(),
      to: contactInbox(),
      replyTo: input.email,
      subject: `CeeCee Prints — new message from ${input.name}`,
      text: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
    });
    return true;
  } catch (error) {
    console.error("[mail] contact message failed:", error);
    return false;
  }
}
