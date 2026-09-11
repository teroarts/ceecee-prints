import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve stored product image paths to root-relative URLs.
 * The DB stores paths like "products/x.webp"; on deep routes
 * (e.g. /admin/products) a bare relative src resolves against the
 * current path and 404s. Absolute URLs pass through untouched.
 */
export function resolveImage(src: string | undefined | null): string {
  if (!src) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
  return "/" + src;
}
