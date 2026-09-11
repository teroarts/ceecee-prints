import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Check, ChevronLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@shared/products";
import { useProducts } from "@/lib/catalog";
import { formatPrice, useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "@/components/store/product-card";
import { ImageLightbox, ZoomHint } from "@/components/store/image-lightbox";
import { cn } from "@/lib/utils";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useProducts();
  const product = products.find((p) => p.slug === slug) ??
    products.find((p) => p.id === slug);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    document.title = product
      ? `${product.name} | CeeCee Prints`
      : "Not found | CeeCee Prints";
  }, [product]);

  useEffect(() => {
    setSize(product && product.sizes.length === 1 ? product.sizes[0] : null);
    setQuantity(1);
  }, [product]);

  const related = useMemo(
    () =>
      product
        ? products
            .filter((p) => p.category === product.category && p.id !== product.id)
            .slice(0, 4)
        : [],
    [product, products],
  );

  if (!product) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-xl font-bold">We couldn't find that piece</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have sold out or the link is off.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to the shop
        </Link>
      </main>
    );
  }

  const oneSize = product.sizes.length === 1;
  const soldOut = !product.inStock || product.stock === 0;
  const canAdd = size !== null && !soldOut;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        data-testid="link-back-to-shop"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Enlarge photo of ${product.name}`}
          className="group/enlarge relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-card-border bg-card focus-visible:outline-2"
          data-testid="button-enlarge-image"
        >
          <img
            src={product.image}
            alt={product.name}
            width={1000}
            height={1000}
            decoding="async"
            className="aspect-square w-full object-cover"
            data-testid={`img-product-${product.id}`}
          />
          <ZoomHint />
        </button>

        <ImageLightbox
          src={product.image}
          alt={product.name}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />

        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {product.category}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl" data-testid="text-product-name">
            {product.name}
          </h1>
          <p className="mt-3 text-lg font-semibold tabular-nums" data-testid="text-product-price">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8 space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                Size {oneSize && <span className="font-normal text-muted-foreground">— one size</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={cn(
                      "h-10 min-w-11 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2",
                      size === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-foreground/40",
                    )}
                    data-testid={`button-size-${s.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center gap-4">
              <div className="flex h-11 items-center rounded-md border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  data-testid="button-quantity-decrease"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums" data-testid="text-quantity">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Increase quantity"
                  className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="button-quantity-increase"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                disabled={!canAdd}
                onClick={() => {
                  if (!size) return;
                  addItem(product.id, size, quantity);
                  toast({
                    title: "Added to cart",
                    description: `${product.name}${oneSize ? "" : ` — size ${size}`}`,
                  });
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="button-add-to-cart"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
                {soldOut ? "Sold out" : "Add to cart"}
              </button>
            </div>

            {product.stock != null && product.stock > 0 && product.stock <= 5 && (
              <p className="-mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">
                Only {product.stock} left in stock.
              </p>
            )}

            {size === null && !oneSize && (
              <p className="-mt-3 text-sm text-muted-foreground" data-testid="text-size-hint">
                Pick a size to add this to your cart.
              </p>
            )}
          </div>

          <div className="mt-10 border-t border-border/70 pt-6">
            <h2 className="text-sm font-semibold">Details</h2>
            <ul className="mt-3 space-y-2">
              {product.details.map((detail) => (
                <li key={detail} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {detail}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Free shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16 sm:mt-24">
          <h2 id="related-heading" className="mb-6 font-display text-xl font-bold">
            Pairs well with
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
