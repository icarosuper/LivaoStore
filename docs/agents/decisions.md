# Decisions

Leia antes de "corrigir" padrões que parecem incompletos. Todos são intencionais.

## Sem Gateway de Pagamento

Fluxo de compra termina no WhatsApp. Pagamento via Pix (QR estático) confirmado manualmente pela admin. Sem webhook de confirmação automática — exigiria PSP (ex: Efí Bank), fora do escopo atual.

## QR Pix Estático (não dinâmico)

QR dinâmico exige PSP. QR estático é gerado no frontend com a chave fixa da admin. Confirmação é manual na dashboard.

## Sem RLS no Supabase

Segurança feita inteiramente via `adminProcedure` no tRPC middleware. RLS desabilitado para simplificar — não adicionar políticas sem revisar o impacto no middleware.

## Estoque Subtraído Só na Confirmação

Pedido criado com `status = 'pending'` não subtrai estoque imediatamente. O estoque disponível é calculado em tempo real (`products.quantity` - soma de `order_items.quantity` onde `orders.status = 'pending'`). Isso evita bloquear estoque de pedidos que podem ser cancelados.

## Carrinho Sem Persistência no Banco

Estado local no cliente apenas. Sem sessão de carrinho no banco. Simplificação válida para o volume esperado — carrinho perdido se o usuário fechar a aba é comportamento aceitável.

## Snapshot de Preço em `order_items.unit_price`

Produto pode ter preço editado após o pedido. `unit_price` preserva o valor cobrado. Nunca recalcular totais históricos a partir de `products.price`.

## Apenas Um Admin

Sem multi-tenant. Auth via Supabase Magic Link para um único e-mail. Expandir para múltiplos admins está fora do escopo.
