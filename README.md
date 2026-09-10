# CeeCee Prints — Merch Storefront Starter

A production-quality merch storefront you can demo to a client and later
transfer to their domain. Built with Express + Vite + React + TypeScript +
Tailwind CSS + shadcn/ui, with SQLite (Drizzle ORM) for orders. Currently
branded as **CeeCee Prints** — a Kenyan graphic t-shirt brand.

## Quick start

```bash
npm install
npm run db:push   # create the orders table in SQLite
npm run dev       # dev server on http://localhost:5000
```

## Editing the catalog

All products live in **`shared/products.ts`** — one typed array. Add, edit,
or remove entries there and the whole site (home, shop, filters, related
products, checkout pricing) updates automatically. Images go in
`client/public/products/`.

When you're ready for a real backend (Supabase, Stripe products, a CMS),
replace the imports from `@shared/products` with API calls — the UI won't
need to change.

## How checkout works (and going live with Stripe)

Checkout is currently a **demo flow**: the form is validated, the order is
persisted to SQLite with server-computed totals, and a confirmation page
shows the order number. No payment is processed.

To go live, swap the `POST /api/orders` call in
`client/src/pages/checkout.tsx` for a Stripe Checkout session:

1. Create a `POST /api/checkout-session` route that builds a Stripe
   Checkout Session from the cart (prices come from `shared/products.ts`
   server-side, so they stay tamper-proof).
2. Redirect the customer to `session.url`.
3. Handle the `checkout.session.completed` webhook to store the order.
4. Set your Stripe keys in `.env` (see `.env.example`).

## Deploying to Vercel / Netlify

This template uses an Express backend, so deploy it as a Node app
(e.g. Vercel with an `api/` adapter, Railway, Render, or Fly.io). For a
static-only deployment, move the products array into the client and drop
the orders API — or host the server on any small Node instance.

## Client handoff checklist

When the client approves and you're ready to transfer:

- [ ] Client creates their Vercel/Netlify account (or you transfer the project)
- [ ] Point the client's domain DNS at the host (A/CNAME records)
- [ ] Rename the brand: logo (`client/src/components/store/logo.tsx`, images
      in `client/public/brand/`), page titles (`client/src/pages/*.tsx`,
      `client/index.html`), copy
- [ ] Replace demo product images and prices in `shared/products.ts`
- [ ] Create the client's Stripe account, set live keys in the host's env vars
- [ ] Swap mock checkout for Stripe Checkout (see above)
- [ ] Set up order-confirmation emails (Stripe receipts or Resend/Postmark)
- [ ] Optional: Supabase for an admin-editable product catalog
- [ ] Transfer the Git repo to the client's organization

## Project structure

```
shared/
  products.ts        # product catalog — edit this to change the shop
  schema.ts          # orders table + zod validation schemas
server/
  routes.ts          # POST /api/orders, GET /api/orders/:orderNumber
  storage.ts         # SQLite persistence via Drizzle
client/
  index.html         # fonts, meta/OG tags, favicon
  src/
    pages/           # home, shop, product, cart, checkout, confirmation, about, contact
    components/store/# header, footer, logo, product card
    lib/cart.tsx     # cart state (React context)
    lib/theme.tsx    # light/dark mode
```
