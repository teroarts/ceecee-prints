import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock, DollarSign, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/cart";
import type { Product } from "@shared/products";

type Stats = {
  orderCount: number;
  revenue: number;
  paidRevenue: number;
  avgOrderValue: number;
  pendingCount: number;
  fulfilledCount: number;
  cancelledCount: number;
  revenueByDay: { date: string; cents: number }[];
  topProducts: { id: string; name: string; units: number; cents: number }[];
  recentOrders: {
    orderNumber: string;
    customerName: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  storageMode: "postgres" | "memory";
};

type InventoryProduct = Pick<Product, "id" | "name" | "stock">;

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Dashboard | CeeCee Prints Admin";
  }, []);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: inventoryProducts } = useQuery<InventoryProduct[]>({
    queryKey: ["/api/admin/products"],
  });
  const tracked = (inventoryProducts ?? []).filter((p) => p.stock != null);
  tracked.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const soldOutCount = tracked.filter((p) => p.stock === 0).length;

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const cards = [
    {
      label: "Order revenue",
      value: formatPrice(stats.revenue),
      hint: `${formatPrice(stats.paidRevenue)} marked paid`,
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: String(stats.orderCount),
      hint: `${stats.fulfilledCount} completed · ${stats.cancelledCount} cancelled`,
      icon: ShoppingCart,
    },
    {
      label: "Awaiting fulfilment",
      value: String(stats.pendingCount),
      hint: "Pending or being prepared",
      icon: Clock,
    },
    {
      label: "Avg. order value",
      value: stats.orderCount ? formatPrice(stats.avgOrderValue) : "—",
      hint: "Across non-cancelled orders",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Sales overview — orders recorded through checkout (payments not yet
          processed online).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#036830" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#036830" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${Math.round(v / 100)}`}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                  width={48}
                />
                <Tooltip
                  formatter={(value: number | string) => formatPrice(Number(value))}
                  labelFormatter={(label: string) =>
                    new Date(label + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  contentStyle={{
                    backgroundColor: "var(--background, #fff)",
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cents"
                  name="Revenue"
                  stroke="#036830"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top products</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {stats.topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-3 text-sm">
                      <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="truncate font-medium">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {p.units} sold · {formatPrice(p.cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {stats.recentOrders.map((o) => (
                  <li key={o.orderNumber} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        <span className="font-mono text-xs">{o.orderNumber}</span>{" "}
                        — {o.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={o.orderStatus === "fulfilled" ? "default" : "secondary"}>
                        {o.orderStatus}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrice(o.total)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {tracked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products are tracking stock yet. Open Products and set
              “Units in stock” for each design to see live inventory here.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {tracked.length} tracked product{tracked.length === 1 ? "" : "s"}
                {soldOutCount > 0
                  ? ` · ${soldOutCount} sold out`
                  : ""}
              </p>
              <ul className="divide-y divide-border/70">
                {tracked.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {p.stock === 0 ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        Out of stock
                      </span>
                    ) : (
                      <span
                        className={
                          "shrink-0 text-sm tabular-nums " +
                          ((p.stock ?? 0) <= 5
                            ? "font-semibold text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground")
                        }
                      >
                        {(p.stock ?? 0) <= 5
                          ? `Only ${p.stock} left`
                          : `${p.stock} in stock`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
