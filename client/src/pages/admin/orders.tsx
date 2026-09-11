import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/cart";
import { cn } from "@/lib/utils";

type OrderItem = {
  productId: string;
  name?: string;
  size: string;
  quantity: number;
  unitPrice?: number;
  image?: string;
};

type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: string;
  subtotal: number;
  shipping: number;
  total: number;
  orderStatus: "pending" | "fulfilled" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  createdAt: string;
};

const ORDER_STATUSES = ["pending", "fulfilled", "cancelled"] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "fulfilled":
    case "paid":
      return "bg-brand-green text-brand-green-foreground";
    case "cancelled":
    case "refunded":
      return "bg-red-600 text-white";
    default:
      return "";
  }
}

export default function AdminOrders() {
  useEffect(() => {
    document.title = "Orders | CeeCee Prints Admin";
  }, []);

  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      orderNumber,
      body,
    }: {
      orderNumber: string;
      body: Record<string, string>;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/orders/${orderNumber}`,
        body,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  if (isLoading || !orders) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} order{orders.length === 1 ? "" : "s"} · update fulfilment
          and payment status inline.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders placed through checkout will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isOpen = expanded === order.orderNumber;
                const items: OrderItem[] = (() => {
                  try {
                    return JSON.parse(order.items) as OrderItem[];
                  } catch {
                    return [];
                  }
                })();

                return (
                  <Fragment key={order.orderNumber}>
                    <tr
                      key={order.orderNumber}
                      className="border-b border-border/60 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          aria-label={isOpen ? "Collapse order" : "Expand order"}
                          aria-expanded={isOpen}
                          onClick={() => setExpanded(isOpen ? null : order.orderNumber)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                          data-testid={`button-expand-${order.orderNumber}`}
                        >
                          <ChevronRight
                            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
                            aria-hidden
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.email}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          value={order.paymentStatus}
                          onValueChange={(value) =>
                            updateStatus.mutate({
                              orderNumber: order.orderNumber,
                              body: { paymentStatus: value },
                            })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[110px] text-xs"
                            aria-label={`Payment status for ${order.orderNumber}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          value={order.orderStatus}
                          onValueChange={(value) =>
                            updateStatus.mutate({
                              orderNumber: order.orderNumber,
                              body: { orderStatus: value },
                            })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[120px] text-xs capitalize"
                            aria-label={`Fulfilment status for ${order.orderNumber}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border/60 bg-muted/30">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Items
                              </h3>
                              <ul className="space-y-2">
                                {items.map((item, i) => (
                                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                                    <span>
                                      {item.name ?? item.productId}{" "}
                                      <span className="text-muted-foreground">
                                        ({item.size} · ×{item.quantity})
                                      </span>
                                    </span>
                                    {item.unitPrice !== undefined && (
                                      <span className="tabular-nums text-muted-foreground">
                                        {formatPrice(item.unitPrice * item.quantity)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-3 text-xs text-muted-foreground">
                                Subtotal {formatPrice(order.subtotal)} · Shipping{" "}
                                {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                              </p>
                            </div>
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Shipping address
                              </h3>
                              <address className="text-sm not-italic leading-relaxed">
                                {order.customerName}
                                <br />
                                {order.address}
                                <br />
                                {order.city}, {order.state} {order.zip}
                              </address>
                              <div className="mt-3 flex gap-2">
                                <Badge variant="secondary" className={statusBadgeClass(order.paymentStatus)}>
                                  {order.paymentStatus}
                                </Badge>
                                <Badge variant="secondary" className={statusBadgeClass(order.orderStatus)}>
                                  {order.orderStatus}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
