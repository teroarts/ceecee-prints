import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, Package } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { Skeleton } from "@/components/ui/skeleton";

type OrderResponse = {
  orderNumber: string;
  customerName: string;
  email: string;
  items: string;
  subtotal: number;
  shipping: number;
  total: number;
};

type OrderItem = {
  productId: string;
  size: string;
  quantity: number;
  /** Snapshot fields present on orders created after the admin update */
  name?: string;
  unitPrice?: number;
  image?: string;
};

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const { data: order, isLoading, isError } = useQuery<OrderResponse>({
    queryKey: ["/api/orders", orderNumber],
  });

  useEffect(() => {
    document.title = "Order confirmed | CeeCee Prints";
  }, []);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Double-check the link, or head back to the shop.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Back to the shop
        </Link>
      </main>
    );
  }

  const items = JSON.parse(order.items) as OrderItem[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-brand-green-foreground">
          <Check className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Thanks, {order.customerName.split(" ")[0]} — order confirmed
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A confirmation is on its way to{" "}
          <span className="font-medium text-foreground">{order.email}</span>.
          Keep your order number handy:
        </p>
        <p
          className="mx-auto mt-2 inline-block rounded-md bg-muted px-4 py-2 font-mono text-sm font-bold tracking-wider"
          data-testid="text-order-number"
        >
          {order.orderNumber}
        </p>
      </div>

      <section aria-label="Order details" className="mt-10 rounded-lg border border-card-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Package className="h-4 w-4" aria-hidden /> What's coming
        </h2>
        <ul className="mt-4 divide-y divide-border/70">
          {items.map((item) => {
            const name = item.name ?? item.productId;
            const unitPrice = item.unitPrice ?? 0;
            return (
              <li key={`${item.productId}-${item.size}`} className="flex items-center gap-3 py-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    decoding="async"
                    className="h-11 w-11 rounded-md border border-card-border object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} · Qty {item.quantity}
                  </p>
                </div>
                {item.unitPrice !== undefined && (
                  <p className="text-sm font-semibold tabular-nums">
                    {formatPrice(unitPrice * item.quantity)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border/70 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-semibold tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="font-semibold tabular-nums">
              {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border/70 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 text-center">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="link-continue-shopping"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
