# Customer Identity + Interest Leva Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add customer identity via localStorage (name + WhatsApp), deduplicate interests per "leva" (stock cycle), allow admin to archive interests when adding stock, and track WhatsApp notification status per interest.

**Architecture:** New `customers` table (whatsapp PK) for future metrics. `product_interests` gains `archived_at` (marks old leva) and `notified_at` (tracks WA notification). Admin "Adicionar estoque" button archives active interests + adds stock atomically. LocalStorage hook pre-fills interest modal, persists identity across visits.

**Tech Stack:** Drizzle ORM · tRPC · Zod · React hooks · localStorage

---

### Task 1: Schema — add `customers` table + new fields to `product_interests`

**Files:**
- Modify: `src/server/db/schema.ts`

**Step 1: Add `customers` table and new columns**

Replace the `productInterests` table definition and add the new table:

```ts
// after orderStatusEnum, before products:
export const customers = pgTable("customers", {
  whatsapp: text("whatsapp").primaryKey(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// update productInterests to add archived_at and notified_at:
export const productInterests = pgTable("product_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  customerName: text("customer_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  archivedAt: timestamp("archived_at"),      // null = active leva; set = past leva
  notifiedAt: timestamp("notified_at"),       // null = not yet notified via WA
});
```

Also add `customersRelations` at the bottom:

```ts
export const customersRelations = relations(customers, ({ many }) => ({
  interests: many(productInterests),
}));
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors (schema compiles fine before migration).

---

### Task 2: Generate and apply migration

**Step 1: Generate migration**

```bash
pnpm db:generate
```

Expected: new file in `drizzle/` directory.

**Step 2: Apply migration**

```bash
pnpm db:migrate
```

Expected: "All migrations applied." (or similar success message).

---

### Task 3: Backend — update `interests.ts`

**Files:**
- Modify: `src/server/api/routers/interests.ts`

**Step 1: Update imports**

Add `and`, `isNull` to drizzle-orm imports. Import `customers` from schema.

**Step 2: Update `register` — upsert customer + dedup check**

```ts
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
    // upsert customer identity
    await ctx.db
      .insert(customers)
      .values({ whatsapp: input.whatsapp, name: input.customerName })
      .onConflictDoUpdate({
        target: customers.whatsapp,
        set: { name: input.customerName, updatedAt: new Date() },
      });

    // dedup: only one active interest per (whatsapp, productId) per leva
    const existing = await ctx.db.query.productInterests.findFirst({
      where: and(
        eq(productInterests.productId, input.productId),
        eq(productInterests.whatsapp, input.whatsapp),
        isNull(productInterests.archivedAt),
      ),
      columns: { id: true },
    });
    if (existing) return { id: existing.id };

    const [interest] = await ctx.db
      .insert(productInterests)
      .values(input)
      .returning({ id: productInterests.id });
    return interest!;
  }),
```

**Step 3: Update `allCounts` — filter active only**

```ts
allCounts: adminProcedure
  .output(
    z.array(z.object({ productId: z.string().uuid(), count: z.number() })),
  )
  .query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ productId: productInterests.productId, count: count() })
      .from(productInterests)
      .where(isNull(productInterests.archivedAt))
      .groupBy(productInterests.productId);
    return rows.map((r) => ({ productId: r.productId, count: r.count }));
  }),
```

**Step 4: Update `listByProduct` — filter active + expose `notifiedAt`**

```ts
listByProduct: adminProcedure
  .input(z.object({ productId: z.string().uuid() }))
  .output(
    z.array(
      z.object({
        id: z.string().uuid(),
        customerName: z.string(),
        whatsapp: z.string(),
        createdAt: z.date().nullable(),
        notifiedAt: z.date().nullable(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    return ctx.db.query.productInterests.findMany({
      where: and(
        eq(productInterests.productId, input.productId),
        isNull(productInterests.archivedAt),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      columns: {
        id: true,
        customerName: true,
        whatsapp: true,
        createdAt: true,
        notifiedAt: true,
      },
    });
  }),
```

**Step 5: Add `markNotified` procedure**

```ts
markNotified: adminProcedure
  .input(z.object({ id: z.string().uuid() }))
  .output(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const [updated] = await ctx.db
      .update(productInterests)
      .set({ notifiedAt: new Date() })
      .where(eq(productInterests.id, input.id))
      .returning({ id: productInterests.id });
    return updated!;
  }),
```

**Step 6: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

---

### Task 4: Backend — add `addStock` to `products.ts`

**Files:**
- Modify: `src/server/api/routers/products.ts`

**Step 1: Add imports**

Add `and`, `isNull`, `sql` to drizzle-orm imports. Import `productInterests` from schema.

**Step 2: Add `addStock` procedure after `update`**

```ts
addStock: adminProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  )
  .output(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // archive all active interests for this product (end of current leva)
    await ctx.db
      .update(productInterests)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(productInterests.productId, input.id),
          isNull(productInterests.archivedAt),
        ),
      );

    const [updated] = await ctx.db
      .update(products)
      .set({
        quantity: sql`${products.quantity} + ${input.quantity}`,
        stockRestockedAt: new Date(),
      })
      .where(eq(products.id, input.id))
      .returning({ id: products.id });

    return updated!;
  }),
```

**Step 3: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

---

### Task 5: Frontend — `useCustomer` hook

**Files:**
- Create: `src/hooks/use-customer.ts`

**Step 1: Create hook**

```ts
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "livao_customer";

type CustomerData = { name: string; whatsapp: string };

export function useCustomer() {
  const [customer, setCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustomer(JSON.parse(stored) as CustomerData);
    } catch {
      // ignore parse errors
    }
  }, []);

  function saveCustomer(data: CustomerData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setCustomer(data);
  }

  function clearCustomer() {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
  }

  return { customer, saveCustomer, clearCustomer };
}
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

---

### Task 6: Frontend — update `interest-modal.tsx`

**Files:**
- Modify: `src/components/interest-modal.tsx`

**Step 1: Replace the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useCustomer } from "~/hooks/use-customer";
import { api } from "~/trpc/react";

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

export function InterestModal({
  productId,
  productName,
  open,
  onClose,
}: Props) {
  const { customer, saveCustomer, clearCustomer } = useCustomer();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setWhatsapp(customer.whatsapp);
    }
  }, [customer]);

  const register = api.interests.register.useMutation({
    onSuccess: () => {
      saveCustomer({ name, whatsapp });
      setDone(true);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ productId, customerName: name, whatsapp });
  }

  function handleReset() {
    clearCustomer();
    setName("");
    setWhatsapp("");
  }

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quero esse item</DialogTitle>
        </DialogHeader>
        {done ? (
          <p className="text-muted-foreground text-sm">
            Anotado! Você será avisado quando <strong>{productName}</strong>{" "}
            estiver disponível.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <p className="text-muted-foreground text-sm">
              Deixe seus dados para ser avisado quando{" "}
              <strong>{productName}</strong> voltar ao estoque.
            </p>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                required
                value={name}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="31999999999"
                required
                value={whatsapp}
              />
            </div>
            <Button disabled={register.isPending} type="submit">
              {register.isPending ? "Salvando..." : "Quero ser avisado"}
            </Button>
            {customer && (
              <button
                className="text-muted-foreground text-xs underline"
                onClick={handleReset}
                type="button"
              >
                Usar outro número
              </button>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

---

### Task 7: Frontend — update `products-tab.tsx`

**Files:**
- Modify: `src/components/admin/products-tab.tsx`

**Step 1: Add state for addStock modal**

Add to the component's state declarations:
```ts
const [addStockProductId, setAddStockProductId] = useState<string | null>(null);
const [addStockQty, setAddStockQty] = useState(1);
```

**Step 2: Add `addStock` and `markNotified` mutations**

```ts
const addStock = api.products.addStock.useMutation({
  onSuccess: () => {
    void utils.products.adminList.invalidate();
    void utils.interests.allCounts.invalidate();
    setAddStockProductId(null);
    setAddStockQty(1);
  },
});

const markNotified = api.interests.markNotified.useMutation({
  onSuccess: () => void utils.interests.listByProduct.invalidate(),
});
```

**Step 3: Add "Adicionar estoque" button**

Add a new `AddStockButton` component inside `ProductsTab` (similar to `InterestButton`):

```tsx
function AddStockButton({ productId }: { productId: string }) {
  return (
    <Button
      onClick={() => {
        setAddStockQty(1);
        setAddStockProductId(productId);
      }}
      size="sm"
      variant="outline"
    >
      Adicionar estoque
    </Button>
  );
}
```

Add `<AddStockButton productId={p.id} />` alongside `<InterestButton>` in both mobile cards and desktop table rows.

**Step 4: Update "Avisar" button in interests dialog**

Replace the interests dialog content to show notified state and call `markNotified`:

```tsx
<div className="flex flex-col gap-2">
  {interests?.map((i) => (
    <div className="flex items-center justify-between" key={i.id}>
      <div>
        <p className={i.notifiedAt ? "font-medium text-muted-foreground" : "font-medium"}>
          {i.customerName}
        </p>
        <p className="text-muted-foreground text-sm">{i.whatsapp}</p>
      </div>
      <Button
        onClick={() => {
          window.open(
            `https://wa.me/${i.whatsapp}?text=${encodeURIComponent(
              `Olá ${i.customerName}! O produto que você se interessou voltou ao estoque. Acesse nossa loja para pedir!`,
            )}`,
            "_blank",
          );
          if (!i.notifiedAt) markNotified.mutate({ id: i.id });
        }}
        size="sm"
        variant={i.notifiedAt ? "ghost" : "outline"}
        className={i.notifiedAt ? "text-muted-foreground" : ""}
      >
        {i.notifiedAt ? "✓ Avisado" : "Avisar"}
      </Button>
    </div>
  ))}
</div>
```

**Step 5: Add "Adicionar estoque" AlertDialog**

Add the dialog at the end of the return, before closing `</div>`:

```tsx
<AlertDialog
  onOpenChange={(o) => !o && setAddStockProductId(null)}
  open={!!addStockProductId}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Adicionar estoque</AlertDialogTitle>
    </AlertDialogHeader>
    <div className="py-2">
      <Label htmlFor="add-stock-qty">Quantidade a adicionar</Label>
      <Input
        id="add-stock-qty"
        min={1}
        onChange={(e) => setAddStockQty(parseInt(e.target.value, 10))}
        type="number"
        value={addStockQty}
      />
      <p className="mt-2 text-muted-foreground text-xs">
        Isso irá arquivar os interesses da leva atual e marcar o produto como reposto.
      </p>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        disabled={addStock.isPending || addStockQty < 1}
        onClick={() =>
          addStockProductId &&
          addStock.mutate({ id: addStockProductId, quantity: addStockQty })
        }
      >
        {addStock.isPending ? "Salvando..." : "Confirmar"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Step 6: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

---

### Task 8: Update docs

**Files:**
- Modify: `docs/agents/architecture.md`
- Modify: `docs/agents/database.md`

**Step 1: Add new procedures to architecture.md tRPC table**

Add rows:
```
| products | `addStock`     | admin | Adiciona estoque + arquiva interesses ativos (nova leva) |
| interests | `markNotified` | admin | Marca interesse como notificado via WhatsApp |
```

Update `interests.register` description:
```
Salva nome + WhatsApp do cliente; deduplica por (whatsapp, productId) na leva ativa; upsert em customers
```

Update `interests.listByProduct` description:
```
Lista interessados ativos (archived_at IS NULL) de um produto com status de notificação
```

**Step 2: Update database.md schema**

Add `customers` table and updated `product_interests` fields:

```
customers
  whatsapp      text PK                -- número com DDI+DDD (identidade do cliente)
  name          text NOT NULL
  updated_at    timestamp default now()

product_interests
  ...
  archived_at   timestamp              -- null = leva ativa; set = leva arquivada (ao adicionar estoque)
  notified_at   timestamp              -- null = não notificado; set = já avisado via WA
```

**Step 3: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.
