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

customers                              -- identidade do cliente (sem login)
  whatsapp       text PK               -- número com DDI+DDD, sem formatação
  name           text NOT NULL
  updated_at     timestamp default now()

product_interests                      -- demanda reprimida: clientes que querem item sem estoque
  id             uuid PK default random()
  product_id     uuid FK → products.id
  customer_name  text NOT NULL
  whatsapp       text NOT NULL          -- número com DDI+DDD, sem formatação
  created_at     timestamp default now()
  archived_at    timestamp              -- null = leva ativa; preenchido = leva arquivada (ao adicionar estoque)
  notified_at    timestamp              -- null = não notificado; preenchido = já avisado via WA

orders
  id             uuid PK default random()
  created_at     timestamp default now()
  status         enum('pending', 'paid', 'delivered', 'cancelled') default 'pending'
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

## Regra de Estoque

`products.quantity` é o estoque real — já descontado de pedidos ativos.
Usar `products.quantity` diretamente; sem JOIN de pedidos pendentes.

## Regra de Subtração/Restauração de Estoque

- Subtrair: na **criação do pedido** (`orders.create`), dentro de transação com `SELECT ... FOR UPDATE`
- Restaurar: em qualquer **cancelamento** (`setStatus → cancelled`)
- `paid → delivered`: sem efeito no estoque

## Migrations

Gerenciadas pelo Drizzle Kit. **Nunca alterar o banco manualmente.**

```bash
pnpm db:generate   # gera migration a partir do schema
pnpm db:migrate    # aplica migrations pendentes
pnpm db:studio     # abre Drizzle Studio (visualização)
```

## Snapshot de Preço

`order_items.unit_price` armazena o preço no momento do pedido. Nunca calcular o total histórico relendo `products.price` — o produto pode ter sido editado.
