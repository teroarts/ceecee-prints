import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Package } from "lucide-react";
import { products, CATEGORIES, type ProductCategory } from "@shared/products";
import { ProductCard } from "@/components/store/product-card";

export default function Home() {
  useEffect(() => {
    document.title = "CeeCee Prints — Kenyan graphic tees";
  }, []);

  const featured = products.filter((p) => p.featured);
  const countByCategory = (category: ProductCategory) =>
    products.filter((p) => p.category === category).length;

  return (
    <main>
      {/* Hero — editorial split */}
      <section className="border-b border-border/70">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <span className="tri-stripe mb-5" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              The first drop — now live
            </p>
            <h1 className="font-display text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
              Wear your <span className="italic text-brand-red">heritage.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Bold Kenyan stories — maps, lions, flags and farm pride — printed
              on premium cotton tees, made to be worn everywhere from Nairobi
              to wherever home is.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/shop"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-red px-6 text-sm font-semibold uppercase tracking-wide text-brand-red-foreground transition-colors hover:bg-brand-red/90 focus-visible:outline-2"
                data-testid="link-shop-hero"
              >
                Shop the collection <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2"
                data-testid="link-about-hero"
              >
                Our story
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img
              src="products/hero-savannah.webp"
              alt="A model wearing the Kenyan Lion tee in golden savannah light"
              width={1050}
              height={1400}
              className="aspect-[3/4] w-full object-cover"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="font-display text-2xl font-medium sm:text-3xl">
              The first six
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Six designs, one story. Printed in small runs.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-red hover:underline sm:inline-flex"
            data-testid="link-shop-all-featured"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      {/* Story band */}
      <section aria-labelledby="story-heading" className="border-y border-border/70 bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="order-last overflow-hidden rounded-lg lg:order-first">
            <img
              src="products/story-workshop.webp"
              alt="Folded tees stacked on a screen-printing workbench with squeegees and ink"
              width={933}
              height={1400}
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] w-full object-cover lg:aspect-[4/3]"
            />
          </div>
          <div className="max-w-md">
            <h2 id="story-heading" className="font-display text-2xl font-medium sm:text-3xl">
              Every shirt tells a Kenyan story
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              CeeCee Prints began with a simple idea: the designs we wear
              should say something true. Each graphic is drawn from the flag,
              the land and the pride of where we come from — then printed by
              hand in small batches on cotton that gets softer with every wash.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
                Premium ringspun cotton, S–2XL
              </li>
              <li className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
                Free shipping on orders over $75
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Collection index */}
      <section aria-labelledby="collection-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 id="collection-heading" className="mb-2 font-display text-2xl font-medium sm:text-3xl">
          Browse the collection
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">Six designs. No filler.</p>
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link
                href={`/shop?category=${encodeURIComponent(category)}`}
                className="group flex items-center justify-between py-5 transition-colors hover:text-brand-red"
                data-testid={`link-category-row-${category.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="font-display text-lg font-medium">{category}</span>
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                  {countByCategory(category)} {countByCategory(category) === 1 ? "design" : "designs"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
