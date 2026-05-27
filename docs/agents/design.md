# Design & Identidade Visual

## Conceito

**Cozy artesanal** — sensação de feira de pequenos produtores, doces feitos à mão, ambiente acolhedor. Inspiração principal: **Stardew Valley** (jogo) — visual quente, orgânico, com personalidade; nada de SaaS frio ou e-commerce genérico.

Princípios visuais derivados do Stardew:
- Sombras **offset flat** (sem blur) dão profundidade sem tentar ser realistas
- Bordas visíveis em todos os elementos — define forma, cria clareza
- Tipografia com personalidade — display font arredondada para títulos/logo
- Cores quentes, terrosas, com nomes evocativos (não "primary-500")
- Micro-interação de **press** nos botões: `translateY` + shadow some ao clicar

---

## Esquema de Cores Ativo — Peach Blossom 🍑

Paleta oficial do app.

| Token              | Valor     | Uso                                      |
|--------------------|-----------|------------------------------------------|
| `--primary`        | `#d96c4a` | Botões, preços, destaques, logo          |
| `--primary-dark`   | `#8b3a24` | Sombra offset dos botões/cards           |
| `--primary-light`  | `#fce4da` | Ghost buttons, card img gradient, badges |
| `--accent`         | `#f4a261` | Badges secundários, destaques pontuais   |
| `--bg`             | `#fef5f0` | Fundo da página                          |
| `--bg2`            | `#ffffff` | Superfície de cards e panels             |
| `--border`         | `#f0c0aa` | Bordas de cards e panels                 |
| `--shadow`         | `#c4907a` | Sombra offset tonal (não cinza)          |
| `--text-dark`      | `#3d1f14` | Títulos e textos primários               |
| `--text-mid`       | `#8a5040` | Descrições e textos secundários          |
| `--text-light`     | `#c4907a` | Labels, dividers, placeholders           |
| `--badge-bg`       | `#f4a261` | Fundo de badge de disponibilidade        |
| `--badge-text`     | `#3d1f14` | Texto de badge de disponibilidade        |

> A sombra é **tonal** (derivada do primary), não cinza neutro — reforça a identidade quente.

---

## Tipografia

| Função         | Font           | Peso  | Onde usar                              |
|----------------|----------------|-------|----------------------------------------|
| Display/Logo   | Fredoka One    | 400   | Logo no header, `<h1>` de seções, nome do app |
| Corpo          | Nunito         | 400–900 | Tudo mais: labels, descrições, botões, preços |

Ambas do Google Fonts. Fredoka One dá o caráter artesanal; Nunito garante legibilidade e hierarquia.

---

## Padrões de Componentes

### Sombras

Todos os elementos elevados usam sombra **offset flat** (sem `blur`):

```css
box-shadow: 4px 4px 0 var(--shadow);   /* cards, panels */
box-shadow: 0 3px 0 var(--primary-dark); /* botões primários */
```

### Botões — Press Effect

Todo botão clicável simula pressionar fisicamente:

```css
button:active {
  transform: translateY(3px);
  box-shadow: 0 0 0 var(--primary-dark); /* shadow some */
}
```

### Bordas

Hierarquia por espessura — mesma cor, pesos diferentes:

- `2.5px` — cards, panels (elementos principais)
- `2px` — header, botão outline
- `1.5px` — badges, botão ghost/disabled

### Dividers Decorativos

Em vez de `<hr>` simples, usar divisores com motivos:

```html
<div class="t-fancy-divider">─── 🌾 ───</div>
<div class="t-fancy-divider">🍑 · 🌿 · 🍂</div>
```

### Textura de Fundo

`body::before` com SVG noise em `opacity: 0.035` — sutil mas adiciona profundidade orgânica ao fundo liso.

---

## Arquivo de Referência

`public/style-demo.html` — demo interativa com todos os esquemas de cor, componentes e tipografia. Contém também 4 esquemas alternativos (Spring Bloom, Lavender Honey, Butter Cream, Berry Jam) para referência futura se o tema mudar.
