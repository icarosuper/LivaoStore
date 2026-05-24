# Conventions

## Componentes

- **Server Components por padrão.** `"use client"` apenas onde necessário: carrinho (estado local), interações do usuário, QR Pix dinâmico.
- Carrinho é **estado local puro** — sem persistência em banco, sem cookies, sem contexto global persistido.

## tRPC

- Todas mutations e queries via tRPC — **não criar Route Handlers separados**.
- Sempre tipar retornos com Zod:

```ts
.output(z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number(),
}))
```

## Produtos

- Produtos desativados (`active = false`) não aparecem na vitrine, mas seus dados são preservados no banco.
- Imagens: usar URL externa (`image_url`). Sem upload de arquivos.

## Pedidos

- Snapshot de preço obrigatório em `order_items.unit_price`.
- Status possíveis: `'pending'` → `'confirmed'` | `'cancelled'`.

## Pix

- QR code **estático** gerado no frontend a partir da chave Pix.
- Payload padrão EMV/BRCode do Banco Central.
- Usar biblioteca `qrcode` (npm) para renderizar; montar string EMV manualmente ou via `pix-utils`.
- Chave Pix via variável de ambiente `NEXT_PUBLIC_PIX_CHAVE`.

## Variáveis de Ambiente

```env
DATABASE_URL=                         # string de conexão direta (Drizzle)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_WHATSAPP_NUMBER=          # com DDI e DDD, sem formatação (ex: 5531999999999)
NEXT_PUBLIC_PIX_CHAVE=
NEXT_PUBLIC_PIX_NOME=
NEXT_PUBLIC_PIX_CIDADE=
```
