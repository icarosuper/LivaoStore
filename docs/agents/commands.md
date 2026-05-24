# Commands

## Setup

```bash
pnpm install
cp .env.example .env.local   # preencher variáveis (ver conventions.md)
pnpm db:migrate              # aplicar schema inicial no Supabase
```

## Desenvolvimento

```bash
pnpm dev          # Next.js dev server (localhost:3000)
pnpm db:studio    # Drizzle Studio — visualizar banco
```

## Qualidade

```bash
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
```

## Build

```bash
pnpm build        # build de produção
pnpm start        # rodar build de produção localmente
```

## Banco de Dados

```bash
pnpm db:generate  # gera migration a partir do schema
pnpm db:migrate   # aplica migrations pendentes
pnpm db:push      # push direto (dev only, sem migration file)
```

> Projeto gerado com `create-t3-app` — os scripts exatos podem variar. Verificar `package.json` para os nomes reais.
