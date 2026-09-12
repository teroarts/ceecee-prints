import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { LogoMark } from "@/components/store/logo";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type SessionInfo = { authenticated: boolean; authConfigured: boolean };

  const { data: session, isLoading } = useQuery<SessionInfo>({
    queryKey: ["/api/admin/session"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    document.title = "Admin login | CeeCee Prints";
  }, []);

  useEffect(() => {
    if (session?.authenticated) navigate("/admin");
  }, [session, navigate]);

  const login = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/admin/login", { password: value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session"] });
      navigate("/admin");
    },
    onError: (err: Error) => {
      setError(err.message.includes("401") ? "Incorrect password." : "Login failed. Try again.");
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    login.mutate(password);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (session && !session.authConfigured) {
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

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-12 w-12" />
          <div>
            <h1 className="font-display text-2xl font-bold">CeeCee Prints</h1>
            <p className="text-sm text-muted-foreground">Admin dashboard</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-6"
          data-testid="form-admin-login"
        >
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter admin password"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-admin-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-testid="button-toggle-password"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={login.isPending || password.length === 0}
            data-testid="button-admin-login"
          >
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
