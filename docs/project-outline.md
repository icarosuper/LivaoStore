# Guideline do Projeto — Loja de Doces

## Visão Geral

Site para gerenciamento e venda de doces artesanais. Possui duas interfaces:
- **Vitrine pública:** clientes visualizam o estoque e montam pedidos
- **Dashboard admin:** a proprietária gerencia produtos e confirma pedidos

Não há gateway de pagamento integrado. O fluxo de compra termina com o cliente enviando o pedido via WhatsApp. O pagamento é feito via Pix (QR code estático exibido na tela de pedido) e confirmado manualmente pela admin na dashboard.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| Linguagem | TypeScript |
| API | tRPC |
| ORM | Drizzle ORM |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth — Magic Link (email) |
| Estilização | Tailwind CSS |
| Deploy | Vercel |

### Setup inicial
Projeto gerado com `create-t3-app`, selecionando: Next.js App Router, tRPC, Drizzle, Tailwind. Supabase Auth configurado manualmente.

---

## Arquitetura

```
app/
├── page.tsx                        → Vitrine pública (lista de produtos)
├── pedido/
│   └── page.tsx                    → Resumo do pedido + botão WhatsApp + QR Pix
└── admin/
    ├── login/
    │   └── page.tsx                → Tela de magic link (email)
    └── page.tsx                    → Dashboard: CRUD de produtos + gestão de pedidos

server/
├── trpc.ts                         → Configuração do tRPC (publicProcedure, adminProcedure)
├── routers/
│   ├── produtos.ts                 → CRUD de produtos
│   └── pedidos.ts                  → Criação e gestão de pedidos
└── db/
    ├── schema.ts                   → Schema Drizzle
    └── index.ts                    → Cliente Drizzle + conexão Supabase

lib/
└── supabase.ts                     → Cliente Supabase Auth (browser + server)
```

---

## Banco de Dados

### Schema Drizzle (`server/db/schema.ts`)

```ts
produtos
  id            uuid PK default random()
  nome          text NOT NULL
  descricao     text
  preco         numeric(10,2) NOT NULL
  quantidade    integer NOT NULL default 0
  imagem_url    text
  ativo         boolean NOT NULL default true
  created_at    timestamp default now()

pedidos
  id            uuid PK default random()
  created_at    timestamp default now()
  status        enum('pendente', 'confirmado', 'cancelado') default 'pendente'
  whatsapp      text                   -- número do cliente (opcional)
  nome_cliente  text                   -- nome do cliente (opcional)
  total         numeric(10,2) NOT NULL

pedido_itens
  id            uuid PK default random()
  pedido_id     uuid FK → pedidos.id
  produto_id    uuid FK → produtos.id
  quantidade    integer NOT NULL
  preco_unit    numeric(10,2) NOT NULL  -- snapshot do preço no momento do pedido
```

### Regra de estoque disponível
O estoque exibido na vitrine deve descontar itens em pedidos pendentes:

```sql
estoque_disponivel = produtos.quantidade - COALESCE(SUM(pedido_itens.quantidade WHERE pedidos.status = 'pendente'), 0)
```

Implemente essa lógica na query da vitrine para evitar overselling.

---

## Autenticação

- Apenas a rota `/admin` requer autenticação
- Usar **Supabase Auth Magic Link**: a admin insere o e-mail, recebe um link e é redirecionada para `/admin`
- Proteger todas as procedures admin via middleware tRPC:

```ts
// server/trpc.ts
const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next()
})
```

- `ctx.session` é populado a partir do cookie de sessão do Supabase no middleware do Next.js
- Rotas públicas usam `publicProcedure`; rotas admin usam `adminProcedure`
- Não usar RLS no Supabase — a segurança é feita inteiramente via tRPC middleware

---

## Fluxo do Cliente

1. Acessa a vitrine (`/`) — vê produtos com estoque disponível
2. Adiciona itens ao carrinho (estado local, sem persistência no banco)
3. Vai para `/pedido` — vê resumo, total e QR code Pix
4. Clica em **"Enviar pedido pelo WhatsApp"** — abre `wa.me/` com mensagem pré-formatada contendo os itens e total
5. O pedido é salvo no banco com `status = 'pendente'` no momento do clique

### Formato da mensagem WhatsApp
```
Olá! Gostaria de fazer um pedido:

• 2x Brigadeiro de chocolate — R$ 6,00
• 1x Trufa de maracujá — R$ 4,50

Total: R$ 10,50

Vou pagar via Pix!
```

---

## Fluxo da Admin

1. Acessa `/admin/login`, insere e-mail, recebe magic link
2. Na dashboard:
   - **Aba Produtos:** listar, criar, editar, ativar/desativar e excluir produtos
   - **Aba Pedidos:** listar pedidos pendentes com itens detalhados
     - Botão **Confirmar** → `status = 'confirmado'` + subtrai `quantidade` dos produtos
     - Botão **Cancelar** → `status = 'cancelado'` + não altera estoque
3. A subtração de estoque ocorre **somente na confirmação**, nunca no momento do pedido

---

## Pix

- QR code **estático** gerado no frontend a partir da chave Pix cadastrada pela admin nas configurações
- Usar biblioteca `qrcode` (npm) para renderizar o QR
- Payload no padrão EMV/BRCode do Banco Central — montar a string manualmente ou usar lib como `pix-utils`
- A chave Pix fica salva em uma tabela `configuracoes` simples (chave/valor) ou em variável de ambiente
- **Não há webhook de confirmação** — confirmação é manual pela admin

---

## Regras Gerais de Desenvolvimento

- Usar **Server Components** por padrão; `"use client"` apenas onde necessário (carrinho, interações)
- Mutations e queries via **tRPC** — não criar Route Handlers separados
- Manter **snapshot de preço** em `pedido_itens.preco_unit` para não perder o valor histórico se o produto for editado
- Produtos desativados (`ativo = false`) não aparecem na vitrine mas seus dados são preservados
- Sempre tipar explicitamente retornos de procedures tRPC com Zod
- Migrations gerenciadas pelo Drizzle (`drizzle-kit`) — nunca alterar o banco manualmente

---

## Variáveis de Ambiente

```env
# Supabase
DATABASE_URL=postgresql://...        # string de conexão direta (Drizzle)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=5531999999999   # número com DDI e DDD, sem formatação

# Pix (alternativa a salvar no banco)
NEXT_PUBLIC_PIX_CHAVE=...            # chave Pix da proprietária
NEXT_PUBLIC_PIX_NOME=...             # nome da recebedora (aparece no QR)
NEXT_PUBLIC_PIX_CIDADE=...
```

---

## Fora do Escopo (por enquanto)

- Confirmação automática de Pix via webhook (exige PSP como Efí Bank)
- Upload de imagens (usar URL externa por enquanto)
- Múltiplos admins
- Histórico de estoque / relatórios
- Notificações push ou e-mail para novos pedidos
