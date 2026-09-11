import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { cn } from "@/lib/utils";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z",
};

export default function Shop() {
  const { products } = useProducts();
  const categories = useMemo<string[]>(
    () => Array.from(new Set(products.map((p) => p.category as string))),
    [products],
  );
  const [location] = useLocation();
  const queryCategory = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const value = params.get("category");
    if (!value) return null;
    return categories.includes(value) ? value : null;
  }, [location]);

  const [category, setCategory] = useState<string | null>(queryCategory);
  const [sort, setSort] = useState<SortKey>("featured");

  useEffect(() => {
    setCategory(queryCategory);
  }, [queryCategory]);

  useEffect(() => {
    document.title = category
      ? `${category} — Shop | CeeCee Prints`
      : "Shop | CeeCee Prints";
  }, [category]);

  const visible = useMemo(() => {
    let list = category ? products.filter((p) => p.category === category) : [...products];
    switch (sort) {
      case "price-asc":
        list = list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list = list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [category, sort]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">
          {category ?? "The full collection"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "design" : "designs"}
          {category ? ` in ${category.toLowerCase()}` : ""} · Free shipping over $75
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2",
              category === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            data-testid="button-filter-all"
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              data-testid={`button-filter-${c.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {c}
            </button>
          ))}
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="h-9 w-[190px] text-sm" aria-label="Sort products" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          Nothing here yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </main>
  );
}
