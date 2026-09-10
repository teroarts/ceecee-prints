import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { formatPrice, useCart } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD } from "@shared/products";

export default function Cart() {
  const { items, subtotal, shipping, total, freeShippingRemaining, updateQuantity, removeItem } =
    useCart();

  useEffect(() => {
    document.title = "Cart | CeeCee Prints";
  }, []);

  if (items.length === 0) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-bold">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Nothing in here yet — the collection is one click away.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="link-shop-empty-cart"
        >
          Browse the shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Your cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.size}`}
              className="flex gap-4 py-5 sm:gap-6"
              data-testid={`row-cart-item-${item.productId}`}
            >
              <Link
                href={`/shop/${item.product.slug}`}
                className="shrink-0 overflow-hidden rounded-md border border-card-border bg-card"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <Link
                    href={`/shop/${item.product.slug}`}
                    className="text-sm font-semibold leading-snug hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">Size {item.size}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(item.product.price)} each
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="flex h-9 items-center rounded-md border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.product.name}`}
                      className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      data-testid={`button-quantity-decrease-${item.productId}`}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.product.name}`}
                      className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      data-testid={`button-quantity-increase-${item.productId}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold tabular-nums" data-testid={`text-line-total-${item.productId}`}>
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size)}
                      aria-label={`Remove ${item.product.name} from cart`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                      data-testid={`button-remove-${item.productId}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg border border-card-border bg-card p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="font-display text-lg font-bold">Order summary</h2>

          {freeShippingRemaining > 0 ? (
            <div className="mt-4 rounded-md bg-muted p-3.5" data-testid="text-free-shipping-hint">
              <p className="flex items-start gap-2 text-sm">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>
                  You're <strong>{formatPrice(freeShippingRemaining)}</strong> away from free
                  shipping.
                </span>
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary" data-testid="text-free-shipping-earned">
              <Truck className="h-4 w-4" aria-hidden /> Free shipping unlocked
            </p>
          )}

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold tabular-nums" data-testid="text-subtotal">
                {formatPrice(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="font-semibold tabular-nums" data-testid="text-shipping">
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border/70 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold tabular-nums" data-testid="text-total">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="link-checkout"
          >
            Checkout <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout
          </p>
        </aside>
      </div>
    </main>
  );
}
