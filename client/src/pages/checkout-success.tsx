import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/cart";

type OrderRecord = {
  orderNumber: string;
  total: number;
  customerName: string;
};

/**
 * Stripe redirects here after payment. The session id arrives inside the
 * hash fragment (the app uses hash routing), so it is parsed manually.
 */
export default function CheckoutSuccess() {
  const [, navigate] = useLocation();
  const { clear } = useCart();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Thank you | CeeCee Prints";
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/checkout/confirm", {
          sessionId,
        });
        const record = (await res.json()) as OrderRecord;
        if (cancelled) return;
        setOrder(record);
        queryClient.setQueryData(["/api/orders", record.orderNumber], record);
        clear();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message.replace(/^\d+:\s*/, "")
              : "Could not verify your payment",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      {error ? (
        <>
          <h1 className="font-display text-2xl font-bold">
            We couldn't confirm your payment
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If you were charged, your order is safe — email{" "}
            <a
              className="underline"
              href="mailto:info@ceeceeprints.com"
            >
              info@ceeceeprints.com
            </a>{" "}
            and we'll sort it out.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to the shop
          </Link>
        </>
      ) : !order ? (
        <div className="flex flex-col items-center gap-4" data-testid="wrapper-confirming">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Confirming your payment…
          </p>
        </div>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-9 w-9 text-primary" aria-hidden />
          </div>
          <h1 className="font-display mt-6 text-2xl font-bold sm:text-3xl">
            Thank you, {order.customerName.split(" ")[0]}!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your payment of{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(order.total)}
            </span>{" "}
            went through. Order{" "}
            <span className="font-mono">{order.orderNumber}</span> is confirmed
            and on its way to being shipped.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/order/${order.orderNumber}`}
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View order
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Keep shopping
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
