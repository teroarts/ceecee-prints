/**
 * One-time (and idempotent) database setup: creates tables if missing and
 * seeds the product catalog from shared/products.ts when the products table
 * is empty. Safe to run repeatedly; exits 0 with a warning when
 * DATABASE_URL is not set so it can run in every Vercel build.
 */
import "dotenv/config";
import postgres from "postgres";
import { products as seedProducts, TEE_SIZES, TEE_DETAILS } from "../shared/products";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db-setup: DATABASE_URL not set — skipping (demo mode).");
  process.exit(0);
}

const sql = postgres(url, {
  max: 1,
  ssl: /sslmode=require/.test(url) ? "require" : undefined,
});

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      description text NOT NULL,
      price integer NOT NULL,
      category text NOT NULL,
      image text NOT NULL,
      sizes text NOT NULL,
      featured boolean NOT NULL DEFAULT false,
      in_stock boolean NOT NULL DEFAULT true,
      stock integer,
      details text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id serial PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      customer_name text NOT NULL,
      email text NOT NULL,
      address text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      zip text NOT NULL,
      items text NOT NULL,
      subtotal integer NOT NULL,
      shipping integer NOT NULL,
      total integer NOT NULL,
      order_status text NOT NULL DEFAULT 'pending',
      stripe_session_id text UNIQUE,
      payment_status text NOT NULL DEFAULT 'unpaid',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

  // Migrations for databases created before these features existed.
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_key ON orders (stripe_session_id)`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_by_size text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_notified_at timestamptz`;

  const existing = await sql`SELECT count(*)::int AS n FROM products`;
  if (existing[0].n === 0) {
    console.log("db-setup: seeding product catalog…");
    for (const [index, p] of seedProducts.entries()) {
      await sql`
        INSERT INTO products (id, slug, name, description, price, category, image, sizes, featured, in_stock, details, sort_order)
        VALUES (${p.id}, ${p.slug}, ${p.name}, ${p.description}, ${p.price}, ${p.category}, ${p.image},
                ${JSON.stringify(p.sizes)}, ${p.featured}, ${p.inStock}, ${JSON.stringify(p.details)}, ${index})`;
    }
    console.log(`db-setup: seeded ${seedProducts.length} products.`);
  } else {
    console.log(`db-setup: products table already has ${existing[0].n} rows.`);
  }

  console.log("db-setup: done.");
  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error("db-setup failed:", error instanceof Error ? error.message : error);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    // ignore
  }
  // Never fail the build — the app degrades to demo mode.
  process.exit(0);
});
