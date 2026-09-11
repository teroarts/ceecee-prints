import { useQuery } from "@tanstack/react-query";
import {
  products as seedProducts,
  getProductById as seedGetProductById,
  getProductBySlug as seedGetProductBySlug,
  type Product,
} from "@shared/products";

/**
 * Storefront catalog access. Products come from the API (database-backed),
 * falling back to the bundled seed catalog when the API is unavailable or
 * the database has not been set up yet. The fallback keeps the shop working
 * in demo mode with zero configuration.
 */
export function useProducts() {
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const products = data && data.length > 0 ? data : seedProducts;
  return { products, isLoading };
}

/** Resolves a product by id from a fetched catalog (with seed fallback). */
export function findProduct(
  products: Product[] | undefined,
  id: string,
): Product | undefined {
  return products?.find((p) => p.id === id) ?? seedGetProductById(id);
}

/** Resolves a product by slug from a fetched catalog (with seed fallback). */
export function findProductBySlug(
  products: Product[] | undefined,
  slug: string,
): Product | undefined {
  return products?.find((p) => p.slug === slug) ?? seedGetProductBySlug(slug);
}
