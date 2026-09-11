import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut, Package, Receipt, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/store/logo";

type SessionInfo = {
  authenticated: boolean;
  authConfigured: boolean;
  dbConfigured: boolean;
  storageMode: "postgres" | "memory";
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, active: "/admin" },
  { href: "/admin/orders", label: "Orders", icon: Receipt, active: "/admin/orders" },
  { href: "/admin/products", label: "Products", icon: Package, active: "/admin/products" },
];

/**
 * Gates the admin area: shows a loader while the session is checked,
 * redirects to the login page when unauthenticated, and explains the setup
 * steps when the admin password or database hasn't been configured.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { data: session, isLoading } = useQuery<SessionInfo>({
    queryKey: ["/api/admin/session"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (session && !session.authenticated) {
      navigate("/admin/login");
    }
  }, [session, navigate]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (!session.authConfigured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
        <div className="rounded-lg border border-border bg-card p-8">
          <h1 className="font-display text-xl font-bold">Admin not configured</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Set the <code className="rounded bg-muted px-1.5 py-0.5">ADMIN_PASSWORD</code>{" "}
            environment variable on the server to enable the admin dashboard.
          </p>
        </div>
      </main>
    );
  }

  if (!session.authenticated) {
    return null; // redirect in flight
  }

  return (
    <AdminShell session={session}>{children}</AdminShell>
  );
}

function AdminShell({
  session,
  children,
}: {
  session: SessionInfo;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const logout = async () => {
    await apiRequest("POST", "/api/admin/logout").catch(() => undefined);
    queryClient.clear();
    window.location.hash = "#/admin/login";
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
          <LogoMark className="h-8 w-8" />
          <div className="leading-tight">
            <p className="text-sm font-bold uppercase tracking-[0.12em]">CeeCee Prints</p>
            <p className="text-xs text-muted-foreground">Admin dashboard</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
          {NAV.map((item) => {
            const active =
              item.active === "/admin"
                ? location === "/admin" || location === "/admin/"
                : location.startsWith(item.active);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <a href="/#/" target="_blank" rel="noreferrer">
              <Store className="h-4 w-4" aria-hidden /> View store
            </a>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={logout}
            data-testid="button-admin-logout"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-bold uppercase tracking-wider">Admin</span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Admin">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium",
                  location === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </nav>
        </header>

        {session.storageMode === "memory" && (
          <div className="border-b border-amber-300/50 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400 sm:px-6">
            {session.dbConfigured
              ? "Warning: the database is configured but could not be reached — running in temporary in-memory mode. Order and product changes will not persist."
              : "Demo mode: no database configured. Set DATABASE_URL (see the Neon setup steps) — orders and product changes will not persist until then."}
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/** Convenience hook used by admin pages to reject non-admin routes. */
export function useIsAdminRoute(): boolean {
  const [match] = useRoute("/admin/:rest*");
  return match;
}
