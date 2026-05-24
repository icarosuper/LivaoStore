# Database

## Schema (`server/db/schema.ts`)

```ts
products
  id                  uuid PK default random()
  name                text NOT NULL
  description         text
  price               numeric(10,2) NOT NULL
  quantity            integer NOT NULL default 0
  image_url           text
  active              boolean NOT NULL default true
  created_at          timestamp default now()
  stock_restocked_at  timestamp                    -- atualizado ao aumentar quantity; vitrine exibe badge "Voltou!" por 24h

product_interests                      -- demanda reprimida: clientes que querem item sem estoque
  id             uuid PK default random()
  product_id     uuid FK → products.id
  customer_name  text NOT NULL
  whatsapp       text NOT NULL          -- número com DDI+DDD, sem formatação
  created_at     timestamp default now()

orders
  id             uuid PK default random()
  created_at     timestamp default now()
  status         enum('pending', 'confirmed', 'cancelled') default 'pending'
  whatsapp       text           -- número do cliente (opcional)
  customer_name  text           -- nome do cliente (opcional)
  total          numeric(10,2) NOT NULL

order_items
  id             uuid PK default random()
  order_id       uuid FK → orders.id
  product_id     uuid FK → products.id
  quantity       integer NOT NULL
  unit_price     numeric(10,2) NOT NULL  -- snapshot do preço no momento do pedido
```

## Regra de Estoque Disponível

A vitrine deve exibir o estoque real descontando pedidos pendentes:

```sql
available_stock = products.quantity
  - COALESCE(SUM(order_items.quantity) WHERE orders.status = 'pending', 0)
```

Implemente essa lógica na query `products.list`. Evita overselling.

## Regra de Subtração de Estoque

- Estoque só é subtraído **na confirmação do pedido** (procedure `orders.confirm`)
- Cancelamento **não** altera estoque
- Nunca subtrair no momento da criação do pedido

## Migrations

Gerenciadas pelo Drizzle Kit. **Nunca alterar o banco manualmente.**

```bash
pnpm db:generate   # gera migration a partir do schema
pnpm db:migrate    # aplica migrations pendentes
pnpm db:studio     # abre Drizzle Studio (visualização)
```

## Snapshot de Preço

`order_items.unit_price` armazena o preço no momento do pedido. Nunca calcular o total histórico relendo `products.price` — o produto pode ter sido editado.
