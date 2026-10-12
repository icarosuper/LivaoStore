# LivaoStore

Production storefront for a small business: catalog, stock, checkout. No payment gateway — the flow ends in **WhatsApp + manual Pix**.

Live: **[livao-store.vercel.app](https://livao-store.vercel.app)**

The customer builds a cart, the order is persisted, stock is reserved in a Postgres transaction (`SELECT … FOR UPDATE`), and a pre-filled WhatsApp message opens with a Pix QR code on screen. Admin is a magic-link dashboard. The storefront listens to Supabase Realtime on `products` and `orders` and revalidates itself.

---

## Table of Contents

- [How it works](#how-it-works)
- [Stack](#stack)
- [Setup](#setup)
- [Commands](#commands)
- [Structure](#structure)
- [Deploy](#deploy)

---

## How it works

**Customer** (`/`)

1. Sees active products with available stock. Badges mark scarcity ("Hurry! Only 3 left") and recent restock ("Back!", for 24h).
2. Sold-out products swap "Add" for **"I want this"** — a modal takes name + WhatsApp and records unmet demand.
3. Cart is local state, persisted in `localStorage` (no cart in the database).
4. At `/pedido`: summary, total, Pix QR code, and "Send order via WhatsApp". The order is stored as `status = 'pending'` and stock is decremented in the same transaction, with `SELECT … FOR UPDATE`.

**Admin** (`/admin`, magic-link)

- **Products:** CRUD, image upload (Supabase Storage bucket `product-images`), enable/disable. Restocking archives the current waitlist and gives each person a "Notify" button that opens WhatsApp with a ready-made message.
- **Orders:** list with line items; `pending → paid → delivered`. Cancel restores stock.

UI copy is Portuguese (storefront and admin). Code and database are English.

## Stack

Next.js 15 (App Router) · TypeScript · tRPC v11 · Drizzle ORM · Supabase (Postgres + Magic Link + Storage) · Tailwind v4 · shadcn/base-ui · Vercel.

## Setup

Needs Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env        # fill in (see below)
pnpm db:migrate             # apply schema
pnpm db:seed                # optional: test data (wipes, then inserts)
pnpm dev                    # http://localhost:3000
```

Database: a Supabase project, or local Postgres via `./start-database.sh` (Docker/Podman).

On Supabase, besides the database:

- enable **Auth → Magic Link** and allow the admin email;
- create a **public** bucket named `product-images`.

### Environment

Validated in `src/env.js` — the build fails if any is missing.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (Drizzle) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public key (auth + storage) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | store number, country code + area, no formatting |
| `NEXT_PUBLIC_PIX_CHAVE` | Pix key |
| `NEXT_PUBLIC_PIX_NOME` | payee name in the Pix payload |
| `NEXT_PUBLIC_PIX_CIDADE` | payee city in the Pix payload |

## Commands

```bash
pnpm dev          # dev server (turbo)
pnpm build        # production build
pnpm start        # run the build

pnpm typecheck    # tsc --noEmit
pnpm check        # biome (lint + format)
pnpm check:write  # biome, apply fixes

pnpm db:generate  # migration from schema
pnpm db:migrate   # apply migrations
pnpm db:push      # push, dev only
pnpm db:studio    # Drizzle Studio
pnpm db:seed      # test data
```

## Structure

```
src/
├── app/              App Router: / · /pedido · /admin · /admin/login
├── components/       storefront, admin, shadcn primitives in ui/
├── hooks/            use-cart (localStorage) · use-customer (identity, no login)
├── lib/              pix · whatsapp · phone · Supabase clients
├── server/
│   ├── api/routers/  products · orders · interests
│   └── db/           Drizzle schema + seed
└── middleware.ts     protects /admin
```

## Deploy

Vercel. Set the same env vars on the project and run `pnpm db:migrate` against production before the first deploy.
