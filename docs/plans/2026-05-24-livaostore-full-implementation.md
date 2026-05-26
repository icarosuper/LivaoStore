# LivaoStore Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build LivaoStore from zero — public candy storefront with cart + WhatsApp checkout, and admin dashboard with product/order management.

**Architecture:** Next.js App Router with Server Components by default; `"use client"` only for cart, modals, and Pix QR. tRPC for all data mutations/queries (no separate Route Handlers). Supabase for PostgreSQL (via Drizzle) and Magic Link auth.

**Tech Stack:** Next.js 15 · TypeScript · tRPC v11 · Drizzle ORM · Supabase · Tailwind CSS · ShadCn · `qrcode` · `pix-utils`

---

## Pre-flight

Before starting, confirm:
- `git remote -v` shows remote set
- Supabase project exists with a direct `DATABASE_URL`
- WhatsApp number, Pix key/name/city available for `.env.local`

---

## Task 1: Scaffold with create-t3-app

**Files:**
- Create: everything at project root

**Step 1: Run scaffolder**

```bash
cd /home/icaro/Projetos/LivaoStore
pnpm create t3-app@latest . \
  --noGit \
  --CI \
  --appRouter \
  --trpc \
  --tailwind \
  --drizzle \
  --dbProvider postgresql \
  --noInstall
```

If `.` complains about non-empty dir (CLAUDE.md exists), run in a temp dir and copy files over — excluding any existing docs/.

**Step 2: Install deps**

```bash
pnpm install
```

**Step 3: Add ShadCn**

```bash
pnpm dlx shadcn@latest init -d
```

Choose: TypeScript · style Default · base color Slate · CSS variables yes. This creates `components/ui/` and updates `tailwind.config.ts`.

**Step 4: Add extra packages**

```bash
pnpm add qrcode pix-utils
pnpm add -D @types/qrcode
```

**Step 5: Set up env**

```bash
cp .env.example .env.local
```

Fill `.env.local`:

```env
DATABASE_URL=postgresql://...           # Supabase direct connection string
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_WHATSAPP_NUMBER=5531999999999
NEXT_PUBLIC_PIX_CHAVE=sua@chave.pix
NEXT_PUBLIC_PIX_NOME=Nome Da Loja
NEXT_PUBLIC_PIX_CIDADE=Belo Horizonte
```

**Step 6: Verify scaffold compiles**

```bash
pnpm typecheck
```

Expected: 0 errors (or only errors in scaffold placeholder files — those get replaced in later tasks).

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with create-t3-app + shadcn"
```

---

## Task 2: Supabase Auth client

**Files:**
- Create: `src/lib/supabase.ts`
- Install: `@supabase/supabase-js` `@supabase/ssr`

**Step 1: Install Supabase packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Step 2: Create `src/lib/supabase.ts`**

```ts
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add supabase browser + server clients"
```

---

## Task 3: Database schema

**Files:**
- Modify: `src/server/db/schema.ts`

**Step 1: Replace schema.ts content**

```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  stockRestockedAt: timestamp("stock_restocked_at"),
});

export const productInterests = pgTable("product_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  customerName: text("customer_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").default(sql`now()`),
  status: orderStatusEnum("status").notNull().default("pending"),
  whatsapp: text("whatsapp"),
  customerName: text("customer_name"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});
```

**Step 2: Generate migration**

```bash
pnpm db:generate
```

Expected: migration files created in `drizzle/` folder.

**Step 3: Apply migration**

```bash
pnpm db:migrate
```

Expected: tables created in Supabase DB.

**Step 4: Typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add src/server/db/schema.ts drizzle/
git commit -m "feat: define database schema with products, orders, interests"
```

---

## Task 4: tRPC context + middleware

**Files:**
- Modify: `src/server/api/trpc.ts` (create-t3-app generates this)

**Step 1: Read the generated `src/server/api/trpc.ts`**

Check what create-t3-app generated. It usually has a `createTRPCContext` function. We need to add session from Supabase.

**Step 2: Replace/update `createTRPCContext` to inject session**

The context function must pull the Supabase session from cookies:

```ts
// At the top of trpc.ts, add:
import { createSupabaseServerClient } from "~/lib/supabase";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    db,
    session,
    headers: opts.headers,
  };
};
```

**Step 3: Add `adminProcedure`**

Below where `publicProcedure` is exported, add:

```ts
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
```

**Step 4: Typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add src/server/api/trpc.ts
git commit -m "feat: add supabase session to trpc context + adminProcedure"
```

---

## Task 5: Products router

**Files:**
- Create: `src/server/api/routers/products.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create `src/server/api/routers/products.ts`**

```ts
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { orderItems, orders, products } from "~/server/db/schema";

export const productsRouter = createTRPCRouter({
  list: publicProcedure
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          description: z.string().nullable(),
          price: z.string(),
          quantity: z.number(),
          availableStock: z.number(),
          imageUrl: z.string().nullable(),
          active: z.boolean(),
          stockRestockedAt: z.date().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          quantity: products.quantity,
          imageUrl: products.imageUrl,
          active: products.active,
          stockRestockedAt: products.stockRestockedAt,
          pendingQty: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'pending' THEN ${orderItems.quantity} ELSE 0 END), 0)`.as("pending_qty"),
        })
        .from(products)
        .leftJoin(orderItems, eq(orderItems.productId, products.id))
        .leftJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(products.active, true))
        .groupBy(products.id);

      return rows.map((r) => ({
        ...r,
        availableStock: Math.max(0, r.quantity - Number(r.pendingQty)),
      }));
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        quantity: z.number().int().min(0),
        imageUrl: z.string().url().optional(),
      }),
    )
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .insert(products)
        .values({
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          quantity: input.quantity,
          imageUrl: input.imageUrl ?? null,
        })
        .returning({ id: products.id });
      return product!;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        quantity: z.number().int().min(0).optional(),
        imageUrl: z.string().url().nullable().optional(),
      }),
    )
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, quantity, ...rest } = input;

      const current = await ctx.db.query.products.findFirst({
        where: eq(products.id, id),
        columns: { quantity: true },
      });

      const stockRestockedAt =
        quantity !== undefined && current && quantity > current.quantity
          ? new Date()
          : undefined;

      const [updated] = await ctx.db
        .update(products)
        .set({
          ...rest,
          ...(quantity !== undefined ? { quantity } : {}),
          ...(stockRestockedAt ? { stockRestockedAt } : {}),
        })
        .where(eq(products.id, id))
        .returning({ id: products.id });

      return updated!;
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
        columns: { active: true },
      });
      const [updated] = await ctx.db
        .update(products)
        .set({ active: !current?.active })
        .where(eq(products.id, input.id))
        .returning({ active: products.active });
      return updated!;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(products)
        .where(eq(products.id, input.id))
        .returning({ id: products.id });
      return deleted!;
    }),
});
```

**Step 2: Register router in `src/server/api/root.ts`**

```ts
import { productsRouter } from "~/server/api/routers/products";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  // ... other routers added in later tasks
});
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/server/api/routers/products.ts src/server/api/root.ts
git commit -m "feat: products tRPC router (list/create/update/toggleActive/delete)"
```

---

## Task 6: Orders router

**Files:**
- Create: `src/server/api/routers/orders.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create `src/server/api/routers/orders.ts`**

```ts
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { orderItems, orders, products } from "~/server/db/schema";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const ordersRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        customerName: z.string().optional(),
        whatsapp: z.string().optional(),
        total: z.string().regex(/^\d+(\.\d{1,2})?$/),
        items: z.array(orderItemSchema).min(1),
      }),
    )
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .insert(orders)
        .values({
          customerName: input.customerName ?? null,
          whatsapp: input.whatsapp ?? null,
          total: input.total,
          status: "pending",
        })
        .returning({ id: orders.id });

      await ctx.db.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );

      return order!;
    }),

  list: adminProcedure
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          createdAt: z.date().nullable(),
          status: z.enum(["pending", "confirmed", "cancelled"]),
          customerName: z.string().nullable(),
          whatsapp: z.string().nullable(),
          total: z.string(),
          items: z.array(
            z.object({
              id: z.string().uuid(),
              productId: z.string().uuid(),
              productName: z.string(),
              quantity: z.number(),
              unitPrice: z.string(),
            }),
          ),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const orderRows = await ctx.db.query.orders.findMany({
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        with: {
          items: {
            with: { product: { columns: { name: true } } },
          },
        },
      });

      return orderRows.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        status: o.status,
        customerName: o.customerName,
        whatsapp: o.whatsapp,
        total: o.total,
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product?.name ?? "Produto removido",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }));
    }),

  confirm: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Update status
      await ctx.db
        .update(orders)
        .set({ status: "confirmed" })
        .where(eq(orders.id, input.id));

      // Subtract stock for each item
      const items = await ctx.db.query.orderItems.findMany({
        where: eq(orderItems.orderId, input.id),
      });

      for (const item of items) {
        await ctx.db
          .update(products)
          .set({
            quantity: eq(products.id, item.productId)
              ? // Use SQL subtraction to avoid race conditions
                ctx.db.$with("sub").as(
                  ctx.db
                    .select({ q: products.quantity })
                    .from(products)
                    .where(eq(products.id, item.productId))
                )
              : products.quantity,
          })
          .where(eq(products.id, item.productId));
      }

      // Simpler approach: raw SQL decrement per item
      // (The above is overly complex — use this instead)
      // Already updated status above; now decrement:
      for (const item of items) {
        await ctx.db.execute(
          sql`UPDATE products SET quantity = GREATEST(0, quantity - ${item.quantity}) WHERE id = ${item.productId}`,
        );
      }

      return { id: input.id };
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(orders)
        .set({ status: "cancelled" })
        .where(eq(orders.id, input.id));
      return { id: input.id };
    }),
});
```

> **Note on `confirm`:** The draft above has a redundant loop. When implementing, use only the `execute(sql...)` approach for decrementing stock. Remove the first `for` loop above that uses `.set()` with complex logic. Final `confirm` should be:
>
> ```ts
> confirm: adminProcedure
>   .input(z.object({ id: z.string().uuid() }))
>   .output(z.object({ id: z.string().uuid() }))
>   .mutation(async ({ ctx, input }) => {
>     await ctx.db
>       .update(orders)
>       .set({ status: "confirmed" })
>       .where(eq(orders.id, input.id));
>
>     const items = await ctx.db.query.orderItems.findMany({
>       where: eq(orderItems.orderId, input.id),
>     });
>
>     for (const item of items) {
>       await ctx.db.execute(
>         sql`UPDATE products SET quantity = GREATEST(0, quantity - ${item.quantity}) WHERE id = ${item.productId}`,
>       );
>     }
>
>     return { id: input.id };
>   }),
> ```

**Step 2: Add `with` relations to schema for Drizzle query API**

In `src/server/db/schema.ts`, add relations at the bottom:

```ts
import { relations } from "drizzle-orm";

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  items: many(orderItems),
  interests: many(productInterests),
}));

export const productInterestsRelations = relations(productInterests, ({ one }) => ({
  product: one(products, { fields: [productInterests.productId], references: [products.id] }),
}));
```

**Step 3: Register in root.ts**

```ts
import { ordersRouter } from "~/server/api/routers/orders";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  orders: ordersRouter,
});
```

**Step 4: Typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add src/server/api/routers/orders.ts src/server/db/schema.ts src/server/api/root.ts
git commit -m "feat: orders tRPC router (create/list/confirm/cancel) + schema relations"
```

---

## Task 7: Interests router

**Files:**
- Create: `src/server/api/routers/interests.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create `src/server/api/routers/interests.ts`**

```ts
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { productInterests } from "~/server/db/schema";

export const interestsRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        customerName: z.string().min(1),
        whatsapp: z.string().min(10),
      }),
    )
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [interest] = await ctx.db
        .insert(productInterests)
        .values(input)
        .returning({ id: productInterests.id });
      return interest!;
    }),

  listByProduct: adminProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          customerName: z.string(),
          whatsapp: z.string(),
          createdAt: z.date().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.productInterests.findMany({
        where: eq(productInterests.productId, input.productId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        columns: {
          id: true,
          customerName: true,
          whatsapp: true,
          createdAt: true,
        },
      });
    }),
});
```

**Step 2: Register in root.ts**

```ts
import { interestsRouter } from "~/server/api/routers/interests";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  orders: ordersRouter,
  interests: interestsRouter,
});
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/server/api/routers/interests.ts src/server/api/root.ts
git commit -m "feat: interests tRPC router (register/listByProduct)"
```

---

## Task 8: Next.js middleware (auth protection)

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create `src/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname === "/admin/login" && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware to protect /admin routes"
```

---

## Task 9: Admin login page

**Files:**
- Create: `src/app/admin/login/page.tsx`

**Step 1: Install ShadCn components needed**

```bash
pnpm dlx shadcn@latest add button input label card
```

**Step 2: Create `src/app/admin/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Acesso Admin</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Link enviado para <strong>{email}</strong>. Verifique seu e-mail.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemplo.com"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat: admin login page with magic link"
```

---

## Task 10: Cart hook

**Files:**
- Create: `src/hooks/use-cart.ts`

**Step 1: Create `src/hooks/use-cart.ts`**

```ts
"use client";

import { useState, useCallback } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: string;
  quantity: number;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.quantity,
    0,
  );

  return { items, addItem, removeItem, updateQuantity, clear, total };
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/hooks/use-cart.ts
git commit -m "feat: useCart hook (local state, no persistence)"
```

---

## Task 11: Pix QR utility

**Files:**
- Create: `src/lib/pix.ts`

**Step 1: Create `src/lib/pix.ts`**

```ts
import QRCode from "qrcode";

function lv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function buildPixPayload(amount: number): string {
  const chave = process.env.NEXT_PUBLIC_PIX_CHAVE ?? "";
  const nome = (process.env.NEXT_PUBLIC_PIX_NOME ?? "").substring(0, 25);
  const cidade = (process.env.NEXT_PUBLIC_PIX_CIDADE ?? "").substring(0, 15);
  const amountStr = amount.toFixed(2);

  const merchantAccountInfo = lv(
    "26",
    lv("00", "BR.GOV.BCB.PIX") + lv("01", chave),
  );

  const payload =
    lv("00", "01") +
    merchantAccountInfo +
    lv("52", "0000") +
    lv("53", "986") +
    lv("54", amountStr) +
    lv("58", "BR") +
    lv("59", nome) +
    lv("60", cidade) +
    lv("62", lv("05", "***")) +
    "6304";

  const crc = crc16(payload);
  return payload + crc;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export async function generatePixQRCode(amount: number): Promise<string> {
  const payload = buildPixPayload(amount);
  return QRCode.toDataURL(payload);
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/pix.ts
git commit -m "feat: static Pix EMV payload + QR code generator"
```

---

## Task 12: WhatsApp message formatter

**Files:**
- Create: `src/lib/whatsapp.ts`

**Step 1: Create `src/lib/whatsapp.ts`**

```ts
import type { CartItem } from "~/hooks/use-cart";

export function buildWhatsAppUrl(items: CartItem[], total: number): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

  const lines = items
    .map(
      (i) =>
        `• ${i.quantity}x ${i.name} — R$ ${(parseFloat(i.price) * i.quantity).toFixed(2).replace(".", ",")}`,
    )
    .join("\n");

  const message = [
    "Olá! Gostaria de fazer um pedido:",
    "",
    lines,
    "",
    `Total: R$ ${total.toFixed(2).replace(".", ",")}`,
    "",
    "Vou pagar via Pix!",
  ].join("\n");

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/whatsapp.ts
git commit -m "feat: WhatsApp URL builder with pre-formatted order message"
```

---

## Task 13: Interest modal component

**Files:**
- Create: `src/components/interest-modal.tsx`

**Step 1: Add ShadCn dialog**

```bash
pnpm dlx shadcn@latest add dialog
```

**Step 2: Create `src/components/interest-modal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

export function InterestModal({ productId, productName, open, onClose }: Props) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [done, setDone] = useState(false);

  const register = api.interests.register.useMutation({
    onSuccess: () => setDone(true),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ productId, customerName: name, whatsapp });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quero esse item</DialogTitle>
        </DialogHeader>
        {done ? (
          <p className="text-sm text-muted-foreground">
            Anotado! Você será avisado quando <strong>{productName}</strong>{" "}
            estiver disponível.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Deixe seus dados para ser avisado quando{" "}
              <strong>{productName}</strong> voltar ao estoque.
            </p>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="31999999999"
                required
              />
            </div>
            <Button type="submit" disabled={register.isPending}>
              {register.isPending ? "Salvando..." : "Quero ser avisado"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/components/interest-modal.tsx
git commit -m "feat: InterestModal component for out-of-stock products"
```

---

## Task 14: Vitrine (/) — product card component

**Files:**
- Create: `src/components/product-card.tsx`

**Step 1: Create `src/components/product-card.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { InterestModal } from "~/components/interest-modal";
import type { CartItem } from "~/hooks/use-cart";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  availableStock: number;
  imageUrl: string | null;
  stockRestockedAt: Date | null;
};

interface Props {
  product: Product;
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

function isRestocked(stockRestockedAt: Date | null): boolean {
  if (!stockRestockedAt) return false;
  const diff = Date.now() - new Date(stockRestockedAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export function ProductCard({ product, onAddToCart }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const restocked = isRestocked(product.stockRestockedAt);

  return (
    <>
      <div className="relative flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden">
        {restocked && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
            Voltou!
          </span>
        )}
        {product.imageUrl && (
          <div className="relative h-48 w-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-2 p-4 flex-1">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-500">{product.description}</p>
          )}
          <p className="mt-auto font-bold text-gray-900">
            R$ {parseFloat(product.price).toFixed(2).replace(".", ",")}
          </p>
          {product.availableStock > 0 ? (
            <Button
              onClick={() =>
                onAddToCart({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                })
              }
            >
              Adicionar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Quero esse item
            </Button>
          )}
        </div>
      </div>
      <InterestModal
        productId={product.id}
        productName={product.name}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/components/product-card.tsx
git commit -m "feat: ProductCard with add-to-cart and out-of-stock interest flow"
```

---

## Task 15: Vitrine page (/) + cart bar

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/cart-bar.tsx`
- Create: `src/app/providers.tsx` (tRPC + TanStack Query providers, already generated by t3-app — verify)

**Step 1: Create `src/components/cart-bar.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import type { CartItem } from "~/hooks/use-cart";

interface Props {
  items: CartItem[];
  total: number;
}

export function CartBar({ items, total }: Props) {
  const router = useRouter();
  const count = items.reduce((s, i) => s + i.quantity, 0);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg flex items-center justify-between">
      <span className="text-sm font-medium">
        {count} {count === 1 ? "item" : "itens"} —{" "}
        <strong>R$ {total.toFixed(2).replace(".", ",")}</strong>
      </span>
      <Button
        onClick={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("cart", JSON.stringify(items));
          }
          router.push("/pedido");
        }}
      >
        Ver pedido
      </Button>
    </div>
  );
}
```

> **Note:** We use `sessionStorage` to pass cart to `/pedido` page to avoid prop-drilling across a page boundary. This is a pragmatic choice for this scope.

**Step 2: Rewrite `src/app/page.tsx`**

```tsx
"use client";

import { api } from "~/trpc/react";
import { useCart } from "~/hooks/use-cart";
import { ProductCard } from "~/components/product-card";
import { CartBar } from "~/components/cart-bar";

export default function HomePage() {
  const { data: products, isLoading } = api.products.list.useQuery();
  const cart = useCart();

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-center text-gray-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
        Nossa loja
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={cart.addItem}
          />
        ))}
      </div>
      <CartBar items={cart.items} total={cart.total} />
    </main>
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/cart-bar.tsx
git commit -m "feat: vitrine page with product grid + cart bar"
```

---

## Task 16: /pedido page

**Files:**
- Create: `src/app/pedido/page.tsx`

**Step 1: Add ShadCn separator**

```bash
pnpm dlx shadcn@latest add separator
```

**Step 2: Create `src/app/pedido/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import type { CartItem } from "~/hooks/use-cart";
import { buildWhatsAppUrl } from "~/lib/whatsapp";
import { generatePixQRCode } from "~/lib/pix";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

export default function PedidoPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const createOrder = api.orders.create.useMutation();

  const total = items.reduce(
    (s, i) => s + parseFloat(i.price) * i.quantity,
    0,
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("cart");
    if (raw) setItems(JSON.parse(raw) as CartItem[]);
  }, []);

  useEffect(() => {
    if (total > 0) {
      generatePixQRCode(total)
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [total]);

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-500">Seu pedido está vazio.</p>
        <Button onClick={() => router.push("/")}>Voltar à loja</Button>
      </main>
    );
  }

  async function handleSend() {
    await createOrder.mutateAsync({
      total: total.toFixed(2),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
    });
    sessionStorage.removeItem("cart");
    window.open(buildWhatsAppUrl(items, total), "_blank");
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold">Seu pedido</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>
              R${" "}
              {(parseFloat(item.price) * item.quantity)
                .toFixed(2)
                .replace(".", ",")}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>R$ {total.toFixed(2).replace(".", ",")}</span>
      </div>

      {qrUrl && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">QR Code Pix</p>
          <Image src={qrUrl} alt="QR Code Pix" width={200} height={200} />
        </div>
      )}

      <Button
        className="mt-8 w-full"
        onClick={handleSend}
        disabled={createOrder.isPending}
      >
        {createOrder.isPending ? "Salvando..." : "Enviar pedido pelo WhatsApp"}
      </Button>
    </main>
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add src/app/pedido/page.tsx
git commit -m "feat: /pedido page with order summary, Pix QR, and WhatsApp send"
```

---

## Task 17: Admin dashboard — products tab

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/product-form.tsx`
- Create: `src/components/admin/products-tab.tsx`

**Step 1: Add ShadCn components**

```bash
pnpm dlx shadcn@latest add table tabs badge textarea switch alert-dialog
```

**Step 2: Create `src/components/admin/product-form.tsx`**

Form component with fields: name, description, price, quantity, imageUrl. Used for both create and edit.

```tsx
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  quantity: number;
  imageUrl: string;
};

interface Props {
  initial?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  loading?: boolean;
  submitLabel?: string;
}

export function ProductForm({ initial, onSubmit, loading, submitLabel = "Salvar" }: Props) {
  const [values, setValues] = useState<ProductFormValues>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    quantity: initial?.quantity ?? 0,
    imageUrl: initial?.imageUrl ?? "",
  });

  function set<K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="desc">Descrição</Label>
        <Textarea id="desc" value={values.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="price">Preço (ex: 6.50)</Label>
        <Input id="price" value={values.price} onChange={(e) => set("price", e.target.value)} pattern="\d+(\.\d{1,2})?" required />
      </div>
      <div>
        <Label htmlFor="qty">Estoque</Label>
        <Input id="qty" type="number" min={0} value={values.quantity} onChange={(e) => set("quantity", parseInt(e.target.value, 10))} required />
      </div>
      <div>
        <Label htmlFor="img">URL da imagem</Label>
        <Input id="img" type="url" value={values.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
```

**Step 3: Create `src/components/admin/products-tab.tsx`**

Large component — handles list, create dialog, edit dialog, toggle, delete confirm, and interests panel.

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { ProductForm, type ProductFormValues } from "~/components/admin/product-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export function ProductsTab() {
  const utils = api.useUtils();
  const { data: products } = api.products.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<typeof products extends (infer T)[] | undefined ? T : never | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [interestProductId, setInterestProductId] = useState<string | null>(null);

  const create = api.products.create.useMutation({ onSuccess: () => { void utils.products.list.invalidate(); setCreateOpen(false); } });
  const update = api.products.update.useMutation({ onSuccess: () => { void utils.products.list.invalidate(); setEditProduct(null); } });
  const toggle = api.products.toggleActive.useMutation({ onSuccess: () => void utils.products.list.invalidate() });
  const del = api.products.delete.useMutation({ onSuccess: () => { void utils.products.list.invalidate(); setDeleteId(null); } });

  const { data: interests } = api.interests.listByProduct.useQuery(
    { productId: interestProductId! },
    { enabled: !!interestProductId },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Produtos</h2>
        <Button onClick={() => setCreateOpen(true)}>+ Novo produto</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell>R$ {parseFloat(p.price).toFixed(2).replace(".", ",")}</TableCell>
              <TableCell>
                {p.availableStock}/{p.quantity}
                {p.availableStock === 0 && <Badge variant="destructive" className="ml-2">Esgotado</Badge>}
              </TableCell>
              <TableCell>
                <Switch
                  checked={p.active}
                  onCheckedChange={() => toggle.mutate({ id: p.id })}
                />
              </TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditProduct(p as unknown as typeof editProduct)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setInterestProductId(p.id)}>
                  Interessados
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(p.id)}>
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
          <ProductForm
            onSubmit={(v) => create.mutate({ ...v, imageUrl: v.imageUrl || undefined, description: v.description || undefined })}
            loading={create.isPending}
            submitLabel="Criar produto"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar produto</DialogTitle></DialogHeader>
          {editProduct && (
            <ProductForm
              initial={{
                name: editProduct.name,
                description: editProduct.description ?? "",
                price: editProduct.price,
                quantity: editProduct.quantity,
                imageUrl: editProduct.imageUrl ?? "",
              }}
              onSubmit={(v) => update.mutate({ id: editProduct.id, ...v, imageUrl: v.imageUrl || null })}
              loading={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir produto?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && del.mutate({ id: deleteId })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interests Panel */}
      <Dialog open={!!interestProductId} onOpenChange={(o) => !o && setInterestProductId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Interessados</DialogTitle></DialogHeader>
          {interests?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum interessado ainda.</p>}
          <div className="flex flex-col gap-2">
            {interests?.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{i.customerName}</p>
                  <p className="text-sm text-muted-foreground">{i.whatsapp}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(`Olá ${i.customerName}! O produto que você se interessou voltou ao estoque. Acesse nossa loja para pedir!`)}`, "_blank")}
                >
                  Avisar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 4: Typecheck**

```bash
pnpm typecheck
```

Fix any type errors (the `editProduct` state type may need refinement).

**Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "feat: admin products tab (CRUD, toggle, delete, interests)"
```

---

## Task 18: Admin dashboard — orders tab

**Files:**
- Create: `src/components/admin/orders-tab.tsx`

**Step 1: Create `src/components/admin/orders-tab.tsx`**

```tsx
"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

export function OrdersTab() {
  const utils = api.useUtils();
  const { data: orders } = api.orders.list.useQuery();
  const confirm = api.orders.confirm.useMutation({ onSuccess: () => void utils.orders.list.invalidate() });
  const cancel = api.orders.cancel.useMutation({ onSuccess: () => void utils.orders.list.invalidate() });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Pedidos</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="text-sm">
                {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "—"}
              </TableCell>
              <TableCell>{o.customerName ?? "—"}</TableCell>
              <TableCell className="text-sm">
                {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
              </TableCell>
              <TableCell>R$ {parseFloat(o.total).toFixed(2).replace(".", ",")}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[o.status]}>
                  {statusLabel[o.status]}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                {o.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => confirm.mutate({ id: o.id })}
                      disabled={confirm.isPending}
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancel.mutate({ id: o.id })}
                      disabled={cancel.isPending}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/components/admin/orders-tab.tsx
git commit -m "feat: admin orders tab with confirm/cancel actions"
```

---

## Task 19: Admin dashboard page

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/layout.tsx`

**Step 1: Create `src/app/admin/layout.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "~/lib/supabase";
import { Button } from "~/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">LivaoStore Admin</h1>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**Step 2: Create `src/app/admin/page.tsx`**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ProductsTab } from "~/components/admin/products-tab";
import { OrdersTab } from "~/components/admin/orders-tab";

export default function AdminPage() {
  return (
    <Tabs defaultValue="products">
      <TabsList>
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
      </TabsList>
      <TabsContent value="products" className="mt-6">
        <ProductsTab />
      </TabsContent>
      <TabsContent value="orders" className="mt-6">
        <OrdersTab />
      </TabsContent>
    </Tabs>
  );
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Lint**

```bash
pnpm lint
```

**Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/layout.tsx
git commit -m "feat: admin dashboard page with products + orders tabs"
```

---

## Task 20: Final verification

**Step 1: Full typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

**Step 2: Dev server smoke test**

```bash
pnpm dev
```

Visit `http://localhost:3000` — should show loading state (no products yet).
Visit `http://localhost:3000/admin/login` — should show login form.
Visit `http://localhost:3000/admin` — should redirect to `/admin/login`.

**Step 3: Seed a product via Drizzle Studio (optional)**

```bash
pnpm db:studio
```

Manually insert a product row to verify the vitrine renders it.

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final typecheck + lint fixes"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Scaffold + install | ⬜ |
| 2 | Supabase clients | ⬜ |
| 3 | DB schema + migration | ⬜ |
| 4 | tRPC context + adminProcedure | ⬜ |
| 5 | Products router | ⬜ |
| 6 | Orders router | ⬜ |
| 7 | Interests router | ⬜ |
| 8 | Next.js middleware | ⬜ |
| 9 | Admin login page | ⬜ |
| 10 | useCart hook | ⬜ |
| 11 | Pix QR utility | ⬜ |
| 12 | WhatsApp formatter | ⬜ |
| 13 | InterestModal | ⬜ |
| 14 | ProductCard | ⬜ |
| 15 | Vitrine page + CartBar | ⬜ |
| 16 | /pedido page | ⬜ |
| 17 | Admin products tab | ⬜ |
| 18 | Admin orders tab | ⬜ |
| 19 | Admin dashboard page | ⬜ |
| 20 | Final verification | ⬜ |
