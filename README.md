# Doces da Kiki

Loja de doces artesanais: vitrine pública onde o cliente monta o pedido e um dashboard admin para gerir produtos e pedidos.

Não há gateway de pagamento. O fluxo termina em **WhatsApp + Pix manual**: o cliente monta o carrinho, o pedido é salvo no banco e uma mensagem pré-formatada abre no WhatsApp da loja, com QR code Pix na tela.

## Stack

Next.js 15 (App Router) · TypeScript · tRPC v11 · Drizzle ORM · Supabase (Postgres + Auth Magic Link + Storage) · Tailwind v4 · shadcn/base-ui · Vercel.

Gerado com `create-t3-app`.

## Como funciona

**Cliente** (`/`)
1. Vê os produtos ativos com estoque disponível. Badges indicam escassez ("Corra! Apenas 3 disponíveis") e reposição recente ("Voltou!", por 24h).
2. Produto esgotado troca "Adicionar" por **"Quero esse item"** — modal pede nome + WhatsApp e registra demanda reprimida.
3. Carrinho é estado local, persistido em `localStorage` (sem carrinho no banco).
4. Em `/pedido`: resumo, total, QR code Pix e botão "Enviar pedido pelo WhatsApp". O pedido é gravado com `status = 'pending'` e o estoque é subtraído nesse momento, em transação com `SELECT ... FOR UPDATE`.

**Admin** (`/admin`, protegido por magic link)
- **Produtos**: CRUD, upload de imagem (bucket `product-images` no Supabase Storage), ativar/desativar. Ao adicionar estoque, a leva de interessados é arquivada e cada um ganha um botão "Avisar" que abre o WhatsApp com mensagem pronta.
- **Pedidos**: lista com itens detalhados; `pending → paid → delivered`. Cancelar devolve o estoque.

A vitrine escuta Supabase Realtime em `products` e `orders` e revalida sozinha.

## Setup

Requer Node 20+ e pnpm.

```bash
pnpm install
cp .env.example .env        # preencher (ver abaixo)
pnpm db:migrate             # aplica o schema
pnpm db:seed                # opcional: dados de teste (limpa antes de inserir)
pnpm dev                    # http://localhost:3000
```

Banco: use um projeto Supabase ou suba um Postgres local com `./start-database.sh` (Docker/Podman).

No Supabase, além do banco, é preciso:
- habilitar **Auth → Magic Link** e liberar o e-mail do admin;
- criar um bucket **público** chamado `product-images`.

### Variáveis de ambiente

Validadas em `src/env.js` — build falha se faltar alguma.

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | conexão Postgres (Drizzle) |
| `NEXT_PUBLIC_SUPABASE_URL` | projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave pública (auth + storage) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | número da loja, DDI+DDD sem formatação |
| `NEXT_PUBLIC_PIX_CHAVE` | chave Pix do recebedor |
| `NEXT_PUBLIC_PIX_NOME` | nome do recebedor no payload Pix |
| `NEXT_PUBLIC_PIX_CIDADE` | cidade do recebedor no payload Pix |

## Comandos

```bash
pnpm dev          # dev server (turbo)
pnpm build        # build de produção
pnpm start        # roda o build

pnpm typecheck    # tsc --noEmit
pnpm check        # biome (lint + format)
pnpm check:write  # biome com correção automática

pnpm db:generate  # gera migration a partir do schema
pnpm db:migrate   # aplica migrations
pnpm db:push      # push direto, só em dev
pnpm db:studio    # Drizzle Studio
pnpm db:seed      # popula dados de teste
```

## Estrutura

```
src/
├── app/              rotas (App Router): / · /pedido · /admin · /admin/login
├── components/       UI da vitrine, admin e primitivos shadcn em ui/
├── hooks/            use-cart (localStorage) · use-customer (identidade sem login)
├── lib/              pix · whatsapp · phone · clientes Supabase
├── server/
│   ├── api/routers/  products · orders · interests
│   └── db/           schema Drizzle + seed
└── middleware.ts     protege /admin
```

Idioma: **código e banco em inglês, texto de interface em português** — inclusive no admin.

## Deploy

Vercel. Configure as mesmas variáveis de ambiente no projeto e rode `pnpm db:migrate` apontando para o banco de produção antes do primeiro deploy.

## Docs

Documentação detalhada em [`docs/agents/`](docs/agents/): [features](docs/agents/features.md) · [architecture](docs/agents/architecture.md) · [database](docs/agents/database.md) · [auth](docs/agents/auth.md) · [conventions](docs/agents/conventions.md) · [decisions](docs/agents/decisions.md) · [design](docs/agents/design.md).
