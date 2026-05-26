# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repo.

## Project Overview

LivaoStore = Next.js (App Router) loja de doces artesanais. Vitrine pública onde clientes montam pedidos + dashboard admin para gestão de produtos/pedidos. Sem gateway de pagamento — fluxo termina em WhatsApp + Pix manual.

Stack: Next.js App Router · TypeScript · tRPC · Drizzle ORM · Supabase (PostgreSQL + Auth Magic Link) · Tailwind CSS · ShadCn · Vercel.

## Language

**Code and database: English.** All identifiers — variable names, function names, file names, table names, column names, enum values, route names, tRPC procedure names — must be in English.

**User-facing content: Portuguese.** All UI text, labels, messages, and errors shown to users (including the admin dashboard) must be in Portuguese.

## Important — After Any Change

1. **Run type check**: `pnpm typecheck`
2. **Run lint**: `pnpm lint`
3. **Update docs** — obrigatório sempre que houver mudança relevante:
   - Nova feature, componente ou hook → atualizar `docs/agents/features.md`
   - Nova rota tRPC ou alteração de procedure → atualizar `docs/agents/architecture.md` e `docs/agents/features.md`
   - Mudança no schema (tabela, coluna, enum) → atualizar `docs/agents/database.md`
   - Nova env var ou padrão arquitetural não óbvio → atualizar o doc relevante em `docs/agents/`
   - Feature movida de "Planned" para "Implemented" → atualizar `docs/agents/features.md`
4. **NEVER COMMIT OR PUSH WITHOUT PERMISSION**: o usuário faz isso

## Docs

- [Features](docs/agents/features.md) — leia antes de adicionar funcionalidades; inventário completo de features implementadas, componentes, hooks e utilitários
- [Architecture](docs/agents/architecture.md) — leia ao navegar no código ou adicionar features; mapeia rotas, fluxos, procedimentos tRPC
- [Database](docs/agents/database.md) — leia ao tocar no schema ou queries; regra de estoque disponível, migrations
- [Auth](docs/agents/auth.md) — leia ao tocar em autenticação, middleware ou proteção de rotas
- [Conventions](docs/agents/conventions.md) — leia ao escrever qualquer código; Server Components, tRPC, Zod, carrinho
- [Commands](docs/agents/commands.md) — leia ao buildar, rodar ou fazer setup do projeto
- [Decisions](docs/agents/decisions.md) — leia antes de "corrigir" padrões incomuns; documenta escolhas arquiteturais intencionais
