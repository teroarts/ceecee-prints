# CeeCee Prints

Merchandise storefront with a full admin dashboard. Built with Express, React
(Vite), TypeScript, Tailwind, shadcn/ui, Drizzle + postgres.js on Neon
Postgres, and Stripe Checkout. Deployed on Vercel.

## Features

- Storefront: product catalog, size selection (S–2XL), cart, checkout
- Payments: Stripe Checkout (order created only after verified payment)
- Inventory: per-product stock tracking with automatic decrement and
  sold-out protection
- Admin dashboard (`/#/admin`): sales stats, revenue chart, order management
  (fulfil / cancel / refund status), product CRUD, live inventory
- Contact form and newsletter signup wiring

## Stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Server     | Express (bundled to a single serverless function)|
| Client     | React + Vite + Tailwind + shadcn/ui              |
| Database   | Neon Postgres via Drizzle / postgres.js          |
| Payments   | Stripe Checkout + webhook backup                 |
| Hosting    | Vercel                                           |

## Getting started

```bash
npm install
cp .env.example .env   # fill in secrets
npm run dev            # client + local API
```

Key scripts:

- `npm run dev` — local development
- `npm run check` — TypeScript check
- `npm run build:vercel` — production bundle (client + api/index.mjs)
- `npm run db:setup` — idempotent DB migration + catalog seed

## Environment variables

| Variable                | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `DATABASE_URL`          | Neon Postgres connection string            |
| `ADMIN_PASSWORD`        | Admin dashboard password                   |
| `ADMIN_SESSION_SECRET`  | Cookie signing secret                      |
| `STRIPE_SECRET_KEY`     | Enables card payments when set             |
| `STRIPE_WEBHOOK_SECRET` | Optional webhook signature verification    |

Without `DATABASE_URL` the app runs in demo mode with an in-memory catalog.

## Deploying

The Vercel project is linked to this repository — pushes to `master` deploy
to production automatically; pull requests get preview deployments.
