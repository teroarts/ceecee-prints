import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice, useCart } from "@/lib/cart";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().min(4, "Please enter your street address"),
  city: z.string().min(2, "Please enter your city"),
  state: z.string().min(2, "Please enter your state").max(20),
  zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, subtotal, shipping, total, clear } = useCart();
  const [, navigate] = useLocation();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const placeOrder = useMutation({
    mutationFn: async (values: CheckoutValues) => {
      const res = await apiRequest("POST", "/api/orders", {
        ...values,
        items: JSON.stringify(
          items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
        ),
      });
      return (await res.json()) as { orderNumber: string };
    },
    onSuccess: (order) => {
      // Seed the cache so the confirmation page renders from this response
      // instead of refetching — serverless instances don't share state.
      queryClient.setQueryData(["/api/orders", order.orderNumber], order);
      clear();
      navigate(`/order/${order.orderNumber}`);
    },
  });

  useEffect(() => {
    document.title = "Checkout | CeeCee Prints";
  }, []);

  if (items.length === 0 && !placeOrder.isPending) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your cart is empty — add a piece or two first.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse the shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => placeOrder.mutate(values))}
            className="space-y-8"
            noValidate
          >
            <section aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jordan Reyes" autoComplete="name" data-testid="input-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jordan@example.com"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section aria-labelledby="shipping-heading">
              <h2 id="shipping-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Shipping address
              </h2>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1420 Prairie Ave"
                          autoComplete="street-address"
                          data-testid="input-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Wichita" autoComplete="address-level2" data-testid="input-city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="KS" autoComplete="address-level1" data-testid="input-state" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP code</FormLabel>
                        <FormControl>
                          <Input placeholder="67201" inputMode="numeric" autoComplete="postal-code" data-testid="input-zip" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            {placeOrder.isError && (
              <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" data-testid="text-order-error">
                Something went wrong placing your order. Please try again.
              </p>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="h-11 w-full text-sm font-semibold"
                disabled={placeOrder.isPending}
                data-testid="button-place-order"
              >
                {placeOrder.isPending ? "Placing order…" : `Place order — ${formatPrice(total)}`}
                {!placeOrder.isPending && <ArrowRight className="ml-1 h-4 w-4" aria-hidden />}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Demo checkout — no payment is processed
              </p>
            </div>
          </form>
        </Form>

        <aside className="h-fit rounded-lg border border-card-border bg-card p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex items-center gap-3">
                <img
                  src={item.product.image}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-md border border-card-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-border/70 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="font-semibold tabular-nums">
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border/70 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
