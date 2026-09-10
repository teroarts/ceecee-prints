import { Link } from "wouter";
import type { Product } from "@shared/products";
import { formatPrice } from "@/lib/cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      data-testid={`card-product-${product.id}`}
    >
      <article className="overflow-hidden rounded-lg border border-card-border bg-card transition-shadow duration-300 group-hover:shadow-lg">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            width={1000}
            height={1000}
            loading={index < 4 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
          <div>
            <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums" data-testid={`text-price-${product.id}`}>
            {formatPrice(product.price)}
          </p>
        </div>
      </article>
    </Link>
  );
}
