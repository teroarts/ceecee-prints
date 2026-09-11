/**
 * Product catalog for the storefront.
 *
 * This is the single source of truth for products. Edit this file to change
 * what appears in the shop — no database required. When you're ready for a
 * real backend (Supabase, etc.), swap the imports in `lib/products.ts` for
 * API calls and leave the UI untouched.
 */
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Price in cents */
  price: number;
  /** Relative path from the site root (no leading slash) */
  image: string;
  category: ProductCategory;
  sizes: string[];
  featured: boolean;
  inStock: boolean;
  details: string[];
};

export type ProductCategory = "Black Tees" | "White Tees";

export const CATEGORIES: ProductCategory[] = ["Black Tees", "White Tees"];

export const FREE_SHIPPING_THRESHOLD = 7500; // cents
export const FLAT_SHIPPING = 600; // cents

/** Unisex tee sizes, S through 2XL. */
export const TEE_SIZES = ["S", "M", "L", "XL", "2XL"];

/** Default care details used by new products in the admin dashboard. */
export const TEE_DETAILS = [
  "100% ringspun cotton, 180 gsm",
  "Soft-touch screen print, made to survive the wash",
  "Unisex fit — order your usual size",
  "Machine wash cold, inside out",
];

export const products: Product[] = [
  {
    id: "african-map-tee",
    slug: "african-map-tee",
    name: "African Map Tee",
    description:
      "The continent in Maasai beadwork geometry — shield mandala, elephant, acacia — printed in bold flag colors on a deep black tee.",
    price: 3000,
    image: "products/african-map-tee.webp",
    category: "Black Tees",
    sizes: TEE_SIZES,
    featured: true,
    inStock: true,
    details: TEE_DETAILS,
  },
  {
    id: "kale-nation-tee",
    slug: "kale-nation-tee",
    name: "Kale Nation Tee",
    description:
      "A salute to the Kale nation — tractor, snow peaks and flanking spears under a bold block-letter headline in flag colors.",
    price: 3000,
    image: "products/kale-nation-tee.webp",
    category: "White Tees",
    sizes: TEE_SIZES,
    featured: false,
    inStock: true,
    details: TEE_DETAILS,
  },
  {
    id: "kenyan-lion-tee",
    slug: "kenyan-lion-tee",
    name: "Kenyan Lion Tee",
    description:
      "The pride of Africa — lion, lioness and Maasai warrior beneath a rising savannah sun, framed in vintage varsity lettering.",
    price: 3200,
    image: "products/kenyan-lion-tee.webp",
    category: "White Tees",
    sizes: TEE_SIZES,
    featured: true,
    inStock: true,
    details: TEE_DETAILS,
  },
  {
    id: "kenyan-map-tee",
    slug: "kenyan-map-tee",
    name: "Kenyan Map Tee",
    description:
      "Kenya's own outline filled with a golden-hour savannah — warrior, elephant and snow-capped peak — glowing against pure black.",
    price: 3000,
    image: "products/kenyan-map-tee.webp",
    category: "Black Tees",
    sizes: TEE_SIZES,
    featured: true,
    inStock: true,
    details: TEE_DETAILS,
  },
  {
    id: "mapunjan-tee",
    slug: "mapunjan-tee",
    name: "Mapunjan Tee",
    description:
      "Kalenjin pride in ink and flag color — a field tractor framed by spears and banner ribbons beneath the Mapunjan masthead.",
    price: 3000,
    image: "products/mapunjan-tee.webp",
    category: "White Tees",
    sizes: TEE_SIZES,
    featured: false,
    inStock: true,
    details: TEE_DETAILS,
  },
  {
    id: "sharp-boy-tee",
    slug: "sharp-boy-tee",
    name: "Sharp Boy Tee",
    description:
      "The flag, remixed — a paint-splashed Maasai shield and crossed spears under a Stay Guided salute to every sharp boy out there.",
    price: 2800,
    image: "products/sharp-boy-tee.webp",
    category: "White Tees",
    sizes: TEE_SIZES,
    featured: true,
    inStock: true,
    details: TEE_DETAILS,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
