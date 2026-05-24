# Auth

## Modelo

Apenas `/admin` requer autenticação. Vitrine e `/pedido` são públicas.

Supabase Auth com **Magic Link**: admin insere e-mail → recebe link → redireciona para `/admin`.

## Proteção via tRPC Middleware

```ts
// server/trpc.ts
const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next()
})
```

- Rotas públicas: `publicProcedure`
- Rotas admin: `adminProcedure`
- `ctx.session` é populado a partir do cookie de sessão Supabase no middleware do Next.js

## Importante

**Sem RLS no Supabase.** Toda segurança é feita via `adminProcedure`. Não adicionar políticas RLS — a camada de proteção é exclusivamente o tRPC middleware.

## Clientes Supabase (`lib/supabase.ts`)

Dois clientes necessários:
- **Browser client** — para componentes client-side (login, callbacks de auth)
- **Server client** — para Server Components e middleware (leitura do cookie de sessão)
