import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Leaf, Package, RotateCcw } from "lucide-react";
import { products, CATEGORIES, type ProductCategory } from "@shared/products";
import { ProductCard } from "@/components/store/product-card";

export default function Home() {
  useEffect(() => {
    document.title = "Northline Supply Co. — Gear for the long way round";
  }, []);

  const featured = products.filter((p) => p.featured);
  const countByCategory = (category: ProductCategory) =>
    products.filter((p) => p.category === category).length;

  return (
    <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src="products/hero-forest.webp"
          alt="A hiker in a clay hoodie walking a pine forest trail at golden hour"
          width={1280}
          height={720}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          decoding="async"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
        <div className="mx-auto flex min-h-[68vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/75">
            Autumn drop — now live
          </p>
          <h1 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl">
            Gear for the long way round.
          </h1>
          <p className="mt-4 max-w-md text-base text-white/85">
            Small-batch apparel, headwear and everyday carry — made in honest
            materials that age better the further you take them.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2"
              data-testid="link-shop-hero"
            >
              Shop the collection <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-11 items-center rounded-md border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2"
              data-testid="link-about-hero"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="font-display text-xl font-bold sm:text-2xl">
              This season's favorites
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The pieces that keep selling out — restocked and ready.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
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
          <div className="overflow-hidden rounded-lg">
            <img
              src="products/flatlay-gear.webp"
              alt="Flat lay of Northline gear — folded tee, beanie, enamel mug, cap and stickers on a wood table"
              width={1000}
              height={563}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="max-w-md">
            <h2 id="story-heading" className="font-display text-xl font-bold sm:text-2xl">
              Built to outlast the trend cycle
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Every piece starts with a question: will someone reach for this in
              five years? We work with organic cottons, brushed fleeces and
              washed canvases from mills we've visited, in runs small enough
              that quality control is personal.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Leaf className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Organic and recycled materials wherever possible
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                30-day no-questions returns
              </li>
              <li className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Carbon-offset shipping on every order
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Category index */}
      <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 id="categories-heading" className="mb-2 font-display text-xl font-bold sm:text-2xl">
          Browse by category
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">Ten pieces. No filler.</p>
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link
                href={`/shop?category=${encodeURIComponent(category)}`}
                className="group flex items-center justify-between py-5 transition-colors hover:text-primary"
                data-testid={`link-category-row-${category.toLowerCase()}`}
              >
                <span className="font-display text-lg font-bold">{category}</span>
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                  {countByCategory(category)} pieces
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
