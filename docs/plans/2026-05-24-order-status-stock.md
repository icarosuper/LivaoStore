# Order Status & Stock Management Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir os status `pending | confirmed | cancelled` por `pending | paid | delivered | cancelled`, subtrair estoque na criação do pedido (com bloqueio transacional), e restaurar ao cancelar. Sem expiração automática — admin cancela pedidos abandonados manualmente.

**Architecture:** `products.quantity` passa a ser o estoque real — já descontado quando o pedido é criado. Criação de pedido usa `SELECT ... FOR UPDATE` + subtração atômica dentro de uma transação. Cancelamento (de qualquer estado) sempre restaura o estoque. Sem cron, sem `expires_at`.

**Tech Stack:** Drizzle ORM (transactions, `for('update')`), tRPC (adminProcedure + publicProcedure).

---

## Transições de status permitidas

```
pending → paid       ✓  (admin marca como pago)
pending → cancelled  ✓  (admin cancela pedido abandonado)
paid    → delivered  ✓  (admin marca como entregue)
paid    → cancelled  ✓  (admin cancela após pagamento)
delivered → *        ✗  (estado final)
cancelled → *        ✗  (estado final)
```

**Efeito no estoque:**
- `null → pending`: subtrai `products.quantity`
- `* → cancelled`: restaura `products.quantity`
- `paid → delivered`: sem efeito
- `pending → paid`: sem efeito (já subtraiu na criação)

---

## Task 1: Schema — novo enum

**Files:**
- Modify: `src/server/db/schema.ts`
- Run: `pnpm db:generate` e `pnpm db:migrate`

**Step 1: Atualizar enum**

Em `src/server/db/schema.ts`, substituir o enum:

```ts
// Antes:
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

// Depois:
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "delivered",
  "cancelled",
]);
```

Não adicionar nenhuma coluna nova — apenas o enum muda.

**Step 2: Gerar e aplicar migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Drizzle vai criar uma migration que adiciona `paid` e `delivered` ao enum e remove `confirmed`. Se houver dados com `status = 'confirmed'` em dev, migrar antes de aplicar:

```sql
UPDATE orders SET status = 'paid' WHERE status = 'confirmed';
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

Esperado: erros em `orders.ts` (usa `"confirmed"` em enums e z.enum) — serão corrigidos nas próximas tasks.

---

## Task 2: `orders.create` — subtração atômica com transação

**Files:**
- Modify: `src/server/api/routers/orders.ts`

**Step 1: Atualizar imports**

No topo de `orders.ts`, garantir que estão importados:

```ts
import { eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { orderItems, orders, products } from "~/server/db/schema";
```

**Step 2: Substituir `orders.create`**

```ts
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
    return ctx.db.transaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);

      // Lock rows to prevent concurrent overselling
      const productRows = await tx
        .select({ id: products.id, name: products.name, quantity: products.quantity })
        .from(products)
        .where(inArray(products.id, productIds))
        .for("update");

      for (const item of input.items) {
        const product = productRows.find((p) => p.id === item.productId);
        if (!product || product.quantity < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Estoque insuficiente para ${product?.name ?? "produto"}`,
          });
        }
      }

      for (const item of input.items) {
        await tx
          .update(products)
          .set({ quantity: sql`quantity - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      const [order] = await tx
        .insert(orders)
        .values({
          customerName: input.customerName ?? null,
          whatsapp: input.whatsapp ?? null,
          total: input.total,
          status: "pending",
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order!.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );

      return order!;
    });
  }),
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

---

## Task 3: `orders.setStatus` — substituir `confirm` e `cancel`

**Files:**
- Modify: `src/server/api/routers/orders.ts`

**Step 1: Atualizar `orders.list` output schema**

Localizar `z.enum(["pending", "confirmed", "cancelled"])` no output de `list` e substituir:

```ts
status: z.enum(["pending", "paid", "delivered", "cancelled"]),
```

**Step 2: Substituir `confirm` e `cancel` por `setStatus`**

Remover as procedures `confirm` e `cancel` inteiras e adicionar:

```ts
setStatus: adminProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["paid", "delivered", "cancelled"]),
    }),
  )
  .output(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
      }

      if (order.status === "cancelled" || order.status === "delivered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedido já finalizado e não pode ser alterado",
        });
      }

      if (input.status === "delivered" && order.status !== "paid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedido precisa estar pago antes de ser marcado como entregue",
        });
      }

      if (input.status === "cancelled") {
        for (const item of order.items) {
          await tx
            .update(products)
            .set({ quantity: sql`quantity + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }

      await tx
        .update(orders)
        .set({ status: input.status })
        .where(eq(orders.id, input.id));

      return { id: input.id };
    });
  }),
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

Esperado: erros no admin UI (ainda usa `confirm` e `cancel`) — serão corrigidos na Task 4.

---

## Task 4: Simplificar `products.list` e `products.adminList`

**Files:**
- Modify: `src/server/api/routers/products.ts`

Com a nova lógica, `products.quantity` já é o estoque real — não há mais necessidade de descontar pedidos pendentes na query.

**Step 1: Substituir `list`**

Remover o JOIN com `orderItems` e `orders`, e o campo `pendingQty`:

```ts
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
      })
      .from(products)
      .where(eq(products.active, true));

    return rows.map((r) => ({ ...r, availableStock: r.quantity }));
  }),
```

**Step 2: Substituir `adminList`** com a mesma lógica (sem o `.where`):

```ts
adminList: adminProcedure
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
      })
      .from(products);

    return rows.map((r) => ({ ...r, availableStock: r.quantity }));
  }),
```

**Step 3: Remover imports não mais usados em `products.ts`**

```ts
import { eq } from "drizzle-orm";
import { products } from "~/server/db/schema";
// Remover: sql, orderItems, orders
```

**Step 4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

---

## Task 5: Admin UI — novos status e botões

**Files:**
- Modify: `src/components/admin/orders-tab.tsx`
- Modify: `src/app/pedido/page.tsx`

**Step 1: Atualizar `orders-tab.tsx` — labels, variantes e mutation**

Substituir os mapas de status:

```ts
const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  delivered: "outline",
  cancelled: "destructive",
};
```

Substituir as mutations `confirm` e `cancel` por `setStatus`:

```ts
const setStatus = api.orders.setStatus.useMutation({
  onSuccess: () => void utils.orders.list.invalidate(),
});
```

**Step 2: Atualizar botões — cards mobile e tabela desktop**

Substituir o bloco `{o.status === "pending" && ...}` em ambos os layouts por:

```tsx
{(o.status === "pending" || o.status === "paid") && (
  <div className="flex gap-2">
    {o.status === "pending" && (
      <Button
        className="flex-1"
        disabled={setStatus.isPending}
        onClick={() => setStatus.mutate({ id: o.id, status: "paid" })}
        size="sm"
      >
        Marcar como Pago
      </Button>
    )}
    {o.status === "paid" && (
      <Button
        className="flex-1"
        disabled={setStatus.isPending}
        onClick={() => setStatus.mutate({ id: o.id, status: "delivered" })}
        size="sm"
      >
        Marcar como Entregue
      </Button>
    )}
    <Button
      className="flex-1"
      disabled={setStatus.isPending}
      onClick={() => setStatus.mutate({ id: o.id, status: "cancelled" })}
      size="sm"
      variant="destructive"
    >
      Cancelar
    </Button>
  </div>
)}
```

**Step 3: Tratamento de erro em `pedido/page.tsx`**

Adicionar estado de erro e tratar a exceção em `handleConfirm`:

```ts
const [errorMsg, setErrorMsg] = useState<string | null>(null);

async function handleConfirm() {
  setErrorMsg(null);
  try {
    await createOrder.mutateAsync({
      total: total.toFixed(2),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
    });
    const url = await generatePixQRCode(total);
    setQrUrl(url);
    setConfirmed(true);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao registrar pedido. Tente novamente.";
    setErrorMsg(msg);
  }
}
```

Renderizar o erro logo antes do botão "Confirmar pedido":

```tsx
{errorMsg && (
  <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
    {errorMsg}
  </p>
)}
```

**Step 4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

---

## Task 6: Atualizar documentação

**Files:**
- Modify: `docs/agents/conventions.md`
- Modify: `docs/agents/database.md`
- Modify: `docs/agents/architecture.md`

**Step 1: `conventions.md` — seção Pedidos**

```md
## Pedidos

- Snapshot de preço obrigatório em `order_items.unit_price`.
- Status: `pending → paid | cancelled`, `paid → delivered | cancelled`. `delivered` e `cancelled` são finais.
- Estoque subtraído de `products.quantity` na criação do pedido (transação com `SELECT ... FOR UPDATE`).
- Estoque restaurado em qualquer cancelamento (`* → cancelled`).
- Sem expiração automática — admin cancela pedidos abandonados manualmente.
```

**Step 2: `database.md` — schema e regras de estoque**

Atualizar o schema de `orders`:

```
orders
  id             uuid PK default random()
  created_at     timestamp default now()
  status         enum('pending', 'paid', 'delivered', 'cancelled') default 'pending'
  whatsapp       text
  customer_name  text
  total          numeric(10,2) NOT NULL
```

Substituir as seções de regras de estoque:

```md
## Regra de Estoque

`products.quantity` é o estoque real — já descontado de pedidos ativos.
Usar `products.quantity` diretamente; sem JOIN de pedidos pendentes.

## Regra de Subtração/Restauração de Estoque

- Subtrair: na **criação do pedido** (`orders.create`), dentro de transação com `SELECT ... FOR UPDATE`
- Restaurar: em qualquer **cancelamento** (`setStatus → cancelled`)
- `paid → delivered`: sem efeito no estoque
```

**Step 3: `architecture.md` — tabela de procedures**

Substituir as linhas de `confirm` e `cancel` por:

```
| orders | `create`    | public | Cria pedido + subtrai estoque (transação FOR UPDATE) |
| orders | `list`      | admin  | Lista pedidos com itens detalhados                   |
| orders | `setStatus` | admin  | Muda status; restaura estoque se cancelado           |
```

---

## Checklist final

- [ ] `pnpm typecheck` sem erros
- [ ] `pnpm lint` sem erros
- [ ] Criar pedido com estoque suficiente → funciona, `products.quantity` decrementado
- [ ] Criar pedido com estoque insuficiente → erro visível na página `/pedido`
- [ ] Dois pedidos simultâneos para o último item → apenas um cria, outro recebe erro
- [ ] Admin: pedido `pending` → botões "Marcar como Pago" + "Cancelar"
- [ ] Admin: pedido `paid` → botões "Marcar como Entregue" + "Cancelar"
- [ ] Admin: pedido `delivered` ou `cancelled` → sem botões
- [ ] Cancelar pedido `paid` → `products.quantity` restaurado (verificar via Drizzle Studio)
- [ ] Tentar mudar status de `cancelled` → erro "Pedido já finalizado"
