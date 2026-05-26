# Architecture

## App Router Structure

```
app/
├── page.tsx                  → Vitrine pública (lista produtos com estoque disponível)
├── pedido/
│   └── page.tsx              → Resumo do pedido + QR Pix + botão WhatsApp
└── admin/
    ├── login/
    │   └── page.tsx          → Magic link (email)
    └── page.tsx              → Dashboard: aba Produtos (CRUD) + aba Pedidos

server/
├── trpc.ts                   → publicProcedure + adminProcedure (middleware de auth)
├── routers/
│   ├── products.ts           → CRUD de produtos
│   ├── orders.ts             → Criação e gestão de pedidos
│   └── interests.ts          → Demanda reprimida: registrar interesse + listar por produto
└── db/
    ├── schema.ts             → Tabelas Drizzle
    └── index.ts              → Cliente Drizzle + conexão Supabase

lib/
└── supabase.ts               → Clientes Supabase Auth (browser + server)
```

## Fluxo do Cliente

1. Acessa `/` — vê produtos com estoque disponível (`products.quantity` já descontado)
2. Produtos com `available_stock = 0` exibem botão **"Quero esse item"** em vez de "Adicionar"
3. Ao clicar: modal pede nome + WhatsApp → salva em `product_interests` via `interests.register`
4. Adiciona itens ao carrinho — **estado local apenas, sem persistência no banco**
5. Vai para `/pedido` — vê resumo, total, QR code Pix
6. Clica "Enviar pedido pelo WhatsApp" → abre `wa.me/` com mensagem pré-formatada
7. Pedido salvo no banco com `status = 'pending'` no momento do clique

### Highlight de Reposição

Produtos cujo estoque aumentou recentemente (campo `stock_restocked_at` atualizado pela admin ao editar `quantity`) recebem badge "Voltou!" na vitrine por 24h.

## Fluxo da Admin

1. Acessa `/admin/login`, insere e-mail → recebe magic link → redireciona para `/admin`
2. Aba **Produtos**: listar, criar, editar, ativar/desativar, excluir
   - Ao aumentar `quantity` de um produto → `stock_restocked_at = now()` + exibe lista de interessados
   - Para cada interessado: botão **"Avisar"** abre `wa.me/{whatsapp}?text=...` com mensagem pré-preenchida
3. Aba **Pedidos**: listar pedidos com itens detalhados
   - **Marcar como Pago** → `status = 'paid'` (apenas de `pending`)
   - **Marcar como Entregue** → `status = 'delivered'` (apenas de `paid`)
   - **Cancelar** → `status = 'cancelled'` + restaura `quantity` dos produtos

## tRPC Procedures

| Router | Procedure | Tipo | Descrição |
|--------|-----------|------|-----------|
| products | `list` | public | Lista produtos ativos com estoque disponível |
| products | `create` | admin | Cria novo produto |
| products | `update` | admin | Edita produto existente |
| products | `toggleActive` | admin | Ativa/desativa produto |
| products | `delete` | admin | Exclui produto |
| orders | `create` | public | Cria pedido + subtrai estoque (transação FOR UPDATE) |
| orders | `list` | admin | Lista pedidos com itens detalhados |
| orders | `setStatus` | admin | Muda status; restaura estoque se cancelado |
| interests | `register` | public | Salva nome + WhatsApp; upsert em `customers`; deduplica por (whatsapp, productId) na leva ativa |
| interests | `listByProduct` | admin | Lista interessados ativos (leva atual) de um produto com status de notificação |
| interests | `markNotified` | admin | Marca interesse como notificado via WhatsApp (`notified_at = now()`) |
| products | `addStock` | admin | Adiciona estoque + arquiva interesses ativos da leva + atualiza `stock_restocked_at` |

## Formato da Mensagem WhatsApp

```
Olá! Gostaria de fazer um pedido:

• 2x Brigadeiro de chocolate — R$ 6,00
• 1x Trufa de maracujá — R$ 4,50

Total: R$ 10,50

Vou pagar via Pix!
```

URL: `wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=...`
