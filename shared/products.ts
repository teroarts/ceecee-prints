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

export type ProductCategory = "Apparel" | "Headwear" | "Accessories";

export const CATEGORIES: ProductCategory[] = ["Apparel", "Headwear", "Accessories"];

export const FREE_SHIPPING_THRESHOLD = 7500; // cents
export const FLAT_SHIPPING = 600; // cents

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const ONE_SIZE = ["One Size"];

export const products: Product[] = [
  {
    id: "ridgeline-tee",
    slug: "ridgeline-heavyweight-tee",
    name: "Ridgeline Heavyweight Tee",
    description:
      "A boxy 240 gsm cotton tee with a substantial hand feel and a collar that keeps its shape wash after wash.",
    price: 3800,
    image: "products/ridgeline-tee.webp",
    category: "Apparel",
    sizes: APPAREL_SIZES,
    featured: true,
    inStock: true,
    details: [
      "100% organic combed cotton, 240 gsm",
      "Garment-dyed for a lived-in finish",
      "Ribbed collar with taped shoulder seams",
      "Machine wash cold, tumble dry low",
    ],
  },
  {
    id: "dusk-hoodie",
    slug: "dusk-pullover-hoodie",
    name: "Dusk Pullover Hoodie",
    description:
      "Our warmest layer in a clay flecked fleece, with a double-lined hood and a kangaroo pocket sized for actual hands.",
    price: 7200,
    image: "products/dusk-hoodie.webp",
    category: "Apparel",
    sizes: APPAREL_SIZES,
    featured: true,
    inStock: true,
    details: [
      "Brushed-back fleece, 400 gsm cotton blend",
      "Double-lined hood with flat drawcords",
      "Ribbed cuffs and hem",
      "Machine wash cold, lay flat to dry",
    ],
  },
  {
    id: "atlas-longsleeve",
    slug: "atlas-long-sleeve-tee",
    name: "Atlas Long-Sleeve Tee",
    description:
      "The Ridgeline with longer arms for cool mornings — a quiet olive layer that works on trail and off.",
    price: 4200,
    image: "products/atlas-longsleeve.webp",
    category: "Apparel",
    sizes: APPAREL_SIZES,
    featured: false,
    inStock: true,
    details: [
      "100% organic cotton, 220 gsm",
      "Set-in sleeves with reinforced cuffs",
      "Pre-shrunk",
      "Machine wash cold",
    ],
  },
  {
    id: "wanderer-crewneck",
    slug: "wanderer-crewneck",
    name: "Wanderer Crewneck",
    description:
      "An oatmeal heather crewneck with a soft interior loopback and enough weight to stand on its own in spring.",
    price: 6400,
    image: "products/wanderer-crewneck.webp",
    category: "Apparel",
    sizes: APPAREL_SIZES,
    featured: false,
    inStock: true,
    details: [
      "Loopback cotton fleece, 350 gsm",
      "V-stitch at collar",
      "Relaxed fit",
      "Machine wash cold, lay flat to dry",
    ],
  },
  {
    id: "field-cap",
    slug: "field-cap",
    name: "Field Cap",
    description:
      "A washed olive six-panel in brushed canvas with a low profile and an adjustable brass slider.",
    price: 3200,
    image: "products/field-cap.webp",
    category: "Headwear",
    sizes: ONE_SIZE,
    featured: true,
    inStock: true,
    details: [
      "Washed cotton canvas",
      "Low-profile six-panel build",
      "Adjustable brass slider strap",
      "Spot clean",
    ],
  },
  {
    id: "hearth-beanie",
    slug: "hearth-beanie",
    name: "Hearth Beanie",
    description:
      "A rust ribbed knit in soft lambswool with a folded cuff that sits right above the ears.",
    price: 2800,
    image: "products/hearth-beanie.webp",
    category: "Headwear",
    sizes: ONE_SIZE,
    featured: false,
    inStock: true,
    details: [
      "100% lambswool, ribbed knit",
      "Folded cuff, one size fits most",
      "Hand wash cold, dry flat",
    ],
  },
  {
    id: "carryall-tote",
    slug: "carryall-tote",
    name: "Carryall Tote",
    description:
      "A natural ecru canvas tote with cross-stitched handles and an interior pocket for the small things.",
    price: 2400,
    image: "products/carryall-tote.webp",
    category: "Accessories",
    sizes: ONE_SIZE,
    featured: true,
    inStock: true,
    details: [
      "16 oz natural cotton canvas",
      "Cross-stitched webbing handles",
      "Interior slip pocket",
      "Machine wash cold",
    ],
  },
  {
    id: "trailhead-bottle",
    slug: "trailhead-bottle",
    name: "Trailhead Bottle",
    description:
      "A matte sage insulated bottle that keeps drinks cold for 24 hours and hot for 12 — 21 oz of everyday utility.",
    price: 3400,
    image: "products/trailhead-bottle.webp",
    category: "Accessories",
    sizes: ONE_SIZE,
    featured: false,
    inStock: true,
    details: [
      "Double-wall vacuum-insulated steel",
      "21 oz / 620 ml",
      "Powder-coated matte finish",
      "Hand wash recommended",
    ],
  },
  {
    id: "enamel-mug",
    slug: "basecamp-enamel-mug",
    name: "Basecamp Enamel Mug",
    description:
      "A speckled cream enamel mug with a steel rim — light enough for the pack, tough enough for the campsite.",
    price: 1800,
    image: "products/enamel-mug.webp",
    category: "Accessories",
    sizes: ONE_SIZE,
    featured: false,
    inStock: true,
    details: [
      "Enamel-coated steel, 12 oz",
      "Speckled cream finish",
      "Campfire and dishwasher safe",
    ],
  },
  {
    id: "trail-stickers",
    slug: "trail-sticker-pack",
    name: "Trail Sticker Pack",
    description:
      "Six die-cut vinyl stickers — peaks, pines and a slow sun — rated for water bottles, laptops and bear boxes.",
    price: 800,
    image: "products/trail-stickers.webp",
    category: "Accessories",
    sizes: ONE_SIZE,
    featured: false,
    inStock: true,
    details: [
      "Six die-cut vinyl stickers",
      "Weatherproof and dishwasher safe",
      "Matte finish",
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
