import { Link } from "wouter";
import { LogoMark } from "./logo";
import { useProducts } from "@/lib/catalog";

export function Footer() {
  const { products } = useProducts();
  const categories = Array.from(new Set(products.map((p) => p.category)));
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <span className="text-sm font-bold uppercase tracking-[0.12em]">
              CeeCee Prints
            </span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Kenyan stories, printed with pride — heritage graphic tees on
            premium cotton.
          </p>
        </div>

        <nav aria-label="Shop categories">
          <h3 className="mb-3 text-sm font-semibold">Shop</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={`/shop?category=${encodeURIComponent(category)}`}
                  className="transition-colors hover:text-foreground"
                  data-testid={`link-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {category}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="transition-colors hover:text-foreground">
                Everything
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/about" className="transition-colors hover:text-foreground">
                Our story
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition-colors hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/cart" className="transition-colors hover:text-foreground">
                Cart
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="mb-3 text-sm font-semibold">The Print Room, our newsletter</h3>
          <p className="text-sm text-muted-foreground">
            New designs and restock notes, once a month. No noise.
          </p>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} CeeCee Prints</p>
          <p>Free shipping on orders over $75</p>
        </div>
      </div>
    </footer>
  );
}
