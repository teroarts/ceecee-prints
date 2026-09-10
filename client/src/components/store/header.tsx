import { Link, useLocation } from "wouter";
import { Moon, ShoppingBag, Sun } from "lucide-react";
import { Logo } from "./logo";
import { useCart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [location] = useLocation();
  const { count } = useCart();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
        <Link href="/" aria-label="CeeCee Prints — home">
          <Logo />
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3",
                location.startsWith(link.href) && "text-foreground",
                link.href === "/contact" && "hidden sm:inline-block",
              )}
              data-testid={`link-${link.href.slice(1)}`}
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            data-testid="link-cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-xs font-bold text-brand-red-foreground"
                data-testid="badge-cart-count"
              >
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
