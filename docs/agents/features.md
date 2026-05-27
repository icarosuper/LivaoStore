# Features

Inventory of all implemented features. Read before adding new functionality to avoid duplication or contradicting existing behavior.

---

## Vitrine pública (`/`)

- Lista produtos **ativos** com estoque disponível via `products.list`
- Grid responsivo: 1 col (mobile) → 2 (sm) → 3 (lg)
- Greeting "Olá, {nome}!" quando cliente identificado via `useCustomer`; botão "Não é você?" para limpar identidade
- **Real-time**: Supabase Realtime subscribe em `products` + `orders` → invalida `products.list` automaticamente

### Badge de estoque

| Condição | Badge |
|----------|-------|
| `availableStock >= 1 && <= 5` | Laranja — "Último disponível!" ou "Corra! Apenas N disponíveis" |
| `availableStock > 5` | Verde — "✓ N disponíveis" |
| `availableStock == 0` | Nenhum badge de quantidade |

### Badge de reposição

`stockRestockedAt` atualizado pela admin → vitrine exibe badge **"Voltou!"** por 24h (`Date.now() - stockRestockedAt < 86400000`).

### Botão de ação por estado

| Estado | Botão |
|--------|-------|
| `availableStock > 0` | "Adicionar" → `useCart.addItem` |
| `availableStock == 0` e `hasInterest == true` | "✓ Interesse registrado" (desabilitado) |
| `availableStock == 0` e `hasInterest == false` | "Quero esse item" → abre `InterestModal` |

`hasInterest` calculado via `interests.activeProductIds` (query pública, filtra por whatsapp do cliente salvo).

---

## Carrinho

Estado local via `useCart` hook. Persistido em `localStorage` (key `livao_cart`) — sobrevive a fechamento de aba/browser. Sem persistência no banco.

| Função | Comportamento |
|--------|---------------|
| `addItem(product)` | Adiciona ou incrementa quantidade |
| `removeItem(productId)` | Remove item |
| `updateQuantity(productId, qty)` | Atualiza; qty ≤ 0 remove o item |
| `clear()` | Esvazia carrinho |

**CartBar** (`components/cart-bar.tsx`): barra fixa na base da tela quando `count > 0`. Navega para `/pedido` ao clicar.

---

## Identificação do cliente (`useCustomer`)

Persiste `{ name, whatsapp }` em `localStorage` (key `livao_customer`). Sem login — identificação voluntária.

- `saveCustomer(data)` — salva e atualiza estado
- `clearCustomer()` — remove do localStorage e zera estado
- Reutilizado em: `InterestModal`, `/pedido`, vitrine (greeting)

---

## Modal de interesse (`InterestModal`)

Aberto pelo `ProductCard` quando cliente clica "Quero esse item".

- Preenche campos automaticamente se `useCustomer` tem dados salvos
- Valida WhatsApp brasileiro (celular e fixo com DDD) via `lib/phone.isValidBrazilianPhone`
- Submit chama `interests.register` (upsert em `customers` + deduplicação por `(whatsapp, productId, archivedAt IS NULL)`)
- Após sucesso: salva cliente no localStorage, exibe mensagem de confirmação
- Botão "Usar outro número" se cliente já identificado

---

## Página de pedido (`/pedido`)

Lê carrinho do `localStorage` (key `livao_cart`). Exibe resumo + total.

### Fluxo de confirmação

1. Se cliente não identificado → abre dialog inline para nome + WhatsApp (validação igual ao `InterestModal`)
2. Chama `orders.create` (transação `FOR UPDATE` no banco, subtrai estoque)
3. Gera QR Code Pix via `lib/pix.generatePixQRCode`
4. Exibe QR + botão "Enviar pedido pelo WhatsApp"
5. "Enviar pelo WhatsApp" → `lib/whatsapp.buildWhatsAppUrl` → `wa.me/` com mensagem pré-formatada
6. "Concluir pedido" → limpa `localStorage` e redireciona para `/`

Erros de `orders.create` exibidos em banner vermelho inline.

---

## Dashboard Admin (`/admin`)

Acesso via Magic Link (Supabase Auth). Middleware protege rotas `/admin/*`.

Duas abas: **Produtos** e **Pedidos**.

---

## Admin — Aba Produtos

Layout responsivo: tabela no desktop, cards no mobile.

**Real-time**: Supabase Realtime em `products` + `orders` → invalida `adminList`; `product_interests` → invalida `allCounts` + `listByProduct`.

### Ações por produto

| Ação | Comportamento |
|------|---------------|
| Criar | Dialog com `ProductForm` → `products.create` |
| Editar | Dialog com `ProductForm` pré-preenchido → `products.update` |
| Ativar/Desativar | Switch com spinner de loading (`togglingId`) → `products.toggleActive` |
| Excluir | AlertDialog de confirmação → `products.delete` |
| Interessados | Dialog com lista da leva ativa → `interests.listByProduct` |
| Adicionar estoque | AlertDialog com input de quantidade → `products.addStock` |

**Switch de ativo**: exibe `<Loader2>` animado durante a mutação; bloqueia clique duplicado via `togglingId` state.

**Badge "Esgotado"**: exibido quando `availableStock == 0`.

### Modal de interessados

- Lista `name`, `whatsapp`, `createdAt`, `notifiedAt` da leva ativa (sem `archivedAt`)
- Botão "Avisar" → abre `wa.me/{whatsapp}?text=...` + chama `interests.markNotified`
- Botão muda para "✓ Avisado" (ghost, muted) após notificação

### Modal de adicionar estoque

- Input de quantidade (mín 1)
- Confirmar → `products.addStock`: arquiva leva ativa de interesses + incrementa `quantity` + seta `stockRestockedAt = now()`

---

## Admin — Aba Pedidos

Layout responsivo: tabela no desktop, cards no mobile.

**Real-time**: Supabase Realtime em `orders` → invalida `orders.list`.

### Status e transições

| Status | Badge (cor) | Ações disponíveis |
|--------|-------------|-------------------|
| `pending` | Âmbar | "Marcar como Pago", "Cancelar" |
| `paid` | Azul | "Marcar como Entregue", "Cancelar" |
| `delivered` | Verde | — |
| `cancelled` | Vermelho | — |

Cancelamento chama `orders.setStatus → 'cancelled'` que restaura `quantity` dos produtos via `FOR UPDATE`.

### Filtros e paginação

`orders.list` aceita parâmetros de paginação e filtros server-side:
- `page` / `pageSize` (padrão 20)
- `status` — filtra por status específico
- `customer` — `ilike` em `customerName` e `whatsapp`
- `dateFrom` / `dateTo` — range de data (dateTo = fim-do-dia, 23:59:59)
- `sortField` (`createdAt` | `total`) + `sortDir` (`asc` | `desc`)

### Pedido manual

Botão "+ Pedido manual" na aba de pedidos abre `ManualOrderDialog`:
- Admin seleciona produtos e quantidades (deduze estoque via `FOR UPDATE`)
- Nome e WhatsApp do cliente opcionais
- Status inicial: `paid`
- Sem fluxo Pix/WhatsApp — só para tracking de vendas feitas fora do sistema

### Link WhatsApp do cliente

Quando o pedido tem `whatsapp` preenchido, exibe link clicável (verde) que abre `wa.me/` direto no número do cliente via `lib/whatsapp.buildCustomerWhatsAppUrl`. Desktop: coluna "WhatsApp". Mobile: abaixo do nome do cliente.

---

## tRPC — Procedimentos implementados

| Router | Procedure | Tipo | Descrição |
|--------|-----------|------|-----------|
| products | `list` | public | Lista ativos com `availableStock` |
| products | `adminList` | admin | Lista todos (ativos e inativos) |
| products | `create` | admin | Cria produto |
| products | `update` | admin | Edita; seta `stockRestockedAt` se `quantity` aumentou |
| products | `addStock` | admin | Incrementa `quantity` + arquiva interesses + seta `stockRestockedAt` |
| products | `toggleActive` | admin | Inverte `active` |
| products | `delete` | admin | Exclui produto |
| orders | `create` | public | Cria pedido + subtrai estoque em transação `FOR UPDATE` |
| orders | `list` | admin | Lista pedidos paginados com filtros (status, cliente, data, sort) |
| orders | `setStatus` | admin | Transição de status; restaura estoque se `cancelled` |
| orders | `createManual` | admin | Cria pedido manual (status=paid) com deducção de estoque; sem fluxo Pix/WhatsApp |
| interests | `register` | public | Upsert `customers` + deduplication por `(whatsapp, productId, leva ativa)` |
| interests | `allCounts` | admin | Contagem de interessados ativos por produto (para badge na tabela) |
| interests | `listByProduct` | admin | Interessados da leva ativa de um produto com `notifiedAt` |
| interests | `activeProductIds` | public | IDs de produtos com interesse ativo do cliente (para "✓ Interesse registrado") |
| interests | `markNotified` | admin | Seta `notifiedAt = now()` em um interesse |

---

## Componentes

| Arquivo | Propósito |
|---------|-----------|
| `components/product-card.tsx` | Card de produto com badges, botão de ação, `InterestModal` |
| `components/cart-bar.tsx` | Barra fixa no rodapé com contagem + total + botão de pedido |
| `components/interest-modal.tsx` | Modal de registro de interesse com identificação do cliente |
| `components/whatsapp-fab.tsx` | FAB do WhatsApp (presente mas não usado na vitrine principal) |
| `components/admin/products-tab.tsx` | Aba de produtos do dashboard admin |
| `components/admin/orders-tab.tsx` | Aba de pedidos do dashboard admin (filtros, paginação, status colorido) |
| `components/admin/manual-order-dialog.tsx` | Dialog de criação de pedido manual pelo admin |
| `components/admin/product-form.tsx` | Formulário reutilizado em criar/editar produto |

---

## Hooks

| Hook | Arquivo | Propósito |
|------|---------|-----------|
| `useCart` | `hooks/use-cart.ts` | Carrinho em memória (add/remove/update/clear/total) |
| `useCustomer` | `hooks/use-customer.ts` | Identidade do cliente em localStorage |

---

## Utilitários (`lib/`)

| Arquivo | Export | Propósito |
|---------|--------|-----------|
| `lib/phone.ts` | `isValidBrazilianPhone(s)` | Valida celular e fixo brasileiro com DDD |
| `lib/pix.ts` | `generatePixQRCode(total)` | Gera QR Code data-URL para pagamento Pix |
| `lib/whatsapp.ts` | `buildWhatsAppUrl(items, total)` | Constrói URL `wa.me/` da loja com mensagem pré-formatada do pedido |
| `lib/whatsapp.ts` | `buildCustomerWhatsAppUrl(phone, message?)` | Constrói URL `wa.me/` para o número do cliente (normaliza DDI 55) |
| `lib/supabase.ts` | `createSupabaseBrowserClient()` | Cliente Supabase para browser (Auth + Realtime) |
| `lib/supabase-server.ts` | — | Cliente Supabase para Server Components |

---

## Real-time (Supabase Realtime)

| Página / Componente | Tabelas monitoradas | Efeito |
|--------------------|---------------------|--------|
| `app/page.tsx` (vitrine) | `products`, `orders` | Invalida `products.list` |
| `admin/products-tab.tsx` | `products`, `orders` | Invalida `adminList` |
| `admin/products-tab.tsx` | `product_interests` | Invalida `allCounts`, `listByProduct` |
| `admin/orders-tab.tsx` | `orders` | Invalida `orders.list` |

---

## UI/UX Backlog

Ver [`docs/ui-ux.md`](../ui-ux.md) para levantamento completo com status de cada item.

---

## Planned / Not Yet Implemented

- Gerenciamento de clientes (tabela de métricas, cancelamento pelo próprio cliente)
- Pedidos: visualização separada de pendentes ordenados por data asc (botão quick-filter)
- Pedidos: visualização separada de pendentes ordenados por data asc
- Layout admin: aba Clientes, tabs alteram URL
- Carrinho: bloquear itens indisponíveis na vitrine (tratar no `/pedido` já implementado)
- Testes (unitários, componente, smoke, E2E)
- Switch ativo: animação durante loading (bloqueio já feito via `togglingId`)
