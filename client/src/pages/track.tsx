import { useEffect, useState, type FormEvent } from "react";
import { Check, Package, PackageCheck, PackageOpen, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

type TrackResult = {
  orderNumber: string;
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "fulfilled" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  carrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  items: { name: string; size: string; quantity: number }[];
  total: number;
  shipping: number;
};

const STEPS: { key: string; label: string; icon: typeof Package }[] = [
  { key: "pending", label: "Order placed", icon: PackageOpen },
  { key: "processing", label: "Being prepared", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

function stepIndex(status: string): number {
  switch (status) {
    case "delivered":
    case "fulfilled":
      return 3;
    case "shipped":
      return 2;
    case "processing":
      return 1;
    default:
      return 0;
  }
}

function formatTotal(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Track() {
  useEffect(() => {
    document.title = "Track your order | CeeCee Prints";
  }, []);

  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/orders/track", {
        orderNumber: orderNumber.trim(),
        email: email.trim(),
      });
      setResult((await res.json()) as TrackResult);
    } catch (err) {
      const message = (err as Error).message || "";
      setError(
        message.includes("404")
          ? "No order found for that order number and email. Double-check both and try again."
          : "Could not look up your order right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const current = result ? stepIndex(result.orderStatus) : 0;
  const cancelled = result?.orderStatus === "cancelled";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the order number from your confirmation along with the email you
          used at checkout.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
        data-testid="form-track"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-order">Order number</Label>
            <Input
              id="track-order"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="CC-XXXXXXXX##"
              className="font-mono"
              required
              data-testid="input-track-order"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-email">Email</Label>
            <Input
              id="track-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="input-track-email"
            />
          </div>
        </div>
        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert" data-testid="text-track-error">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading} data-testid="button-track">
          {loading ? "Looking up…" : "Find my order"}
        </Button>
      </form>

      {result && (
        <div
          className="mt-8 space-y-6 rounded-lg border border-border bg-card p-6"
          data-testid="card-track-result"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-lg font-semibold">
              {result.orderNumber}
            </h2>
            <p className="text-sm text-muted-foreground">
              Placed{" "}
              {new Date(result.createdAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {cancelled ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              This order was cancelled. If you have questions, reach out at{" "}
              <a
                href="mailto:printsbyceecee@gmail.com"
                className="font-semibold underline"
              >
                printsbyceecee@gmail.com
              </a>
              .
            </div>
          ) : (
            <ol className="space-y-0" data-testid="list-track-steps">
              {STEPS.map((step, i) => {
                const done = i <= current;
                const isLast = i === STEPS.length - 1;
                const Icon = step.icon;
                return (
                  <li key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors " +
                          (done
                            ? "border-brand-green bg-brand-green text-brand-green-foreground"
                            : "border-border bg-card text-muted-foreground")
                        }
                      >
                        {done ? (
                          <Check className="h-4 w-4" aria-hidden />
                        ) : (
                          <Icon className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      {!isLast && (
                        <span
                          className={
                            "w-0.5 flex-1 " +
                            (i < current ? "bg-brand-green" : "bg-border")
                          }
                          style={{ minHeight: "1.5rem" }}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className={isLast ? "pb-0" : "pb-6"}>
                      <p
                        className={
                          "text-sm font-semibold leading-9 " +
                          (done ? "" : "text-muted-foreground")
                        }
                      >
                        {step.label}
                        {i === current && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            current status
                          </span>
                        )}
                      </p>
                      {i === 2 && i === current && result.carrier && (
                        <p className="text-sm text-muted-foreground">
                          Carrier: {result.carrier}
                          {result.trackingNumber && (
                            <>
                              {" "}
                              · Tracking:{" "}
                              <span className="font-mono">
                                {result.trackingNumber}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </h3>
            <ul className="space-y-1 text-sm">
              {result.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span>
                    {item.quantity} × {item.name}
                    <span className="text-muted-foreground"> ({item.size})</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Total {formatTotal(result.total)} · Shipping{" "}
              {result.shipping === 0 ? "Free" : formatTotal(result.shipping)}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
