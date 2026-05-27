# Design & Identidade Visual

## Conceito

**Cozy artesanal** — sensação de feira de pequenos produtores, doces feitos à mão, ambiente acolhedor. Inspiração principal: **Stardew Valley** (jogo) — visual quente, orgânico, com personalidade; nada de SaaS frio ou e-commerce genérico.

Princípios visuais derivados do Stardew:

- Sombras **offset flat** (sem blur) dão profundidade sem tentar ser realistas
- Bordas visíveis em todos os elementos — define forma, cria clareza
- Tipografia com personalidade — **Baloo 2** no logo/títulos, **Nunito** no corpo
- Elementos decorativos em **pixel art SVG** (sprites de coração, folha, estrela, pêssego) reforçam a vibe do Stardew sem usar assets proprietários
- Cores quentes, terrosas, com nomes evocativos (não "primary-500")
- Micro-interação de **press** nos botões: `translateY(3px)` + shadow some ao clicar

---

## Esquema de Cores Ativo — Peach Blossom 🍑

Paleta oficial do app. **Importante:** todas as cores devem ser aplicadas como hex explícito em elementos interativos (botões, badges, CartBar) — nunca como CSS variables do sistema do host, que podem ser sobrescritas em dark mode e tornar texto invisível.

| Token             | Valor     | Uso                                      |
| ----------------- | --------- | ---------------------------------------- |
| `--primary`       | `#d96c4a` | Botões primários, preços, destaques, logo |
| `--primary-dark`  | `#8b3a24` | Sombra offset dos botões/cards, borders  |
| `--primary-light` | `#fce4da` | Ghost buttons, card img gradient, badges |
| `--accent`        | `#f4a261` | Badges secundários, destaques pontuais   |
| `--bg`            | `#fef5f0` | Fundo da página                          |
| `--bg2`           | `#fff8f4` | Superfície de cards e panels             |
| `--border`        | `#f0c0aa` | Bordas de cards e panels                 |
| `--shadow`        | `#c4907a` | Sombra offset tonal (não cinza)          |
| `--text-dark`     | `#3d1f14` | Títulos e textos primários               |
| `--text-mid`      | `#8a5040` | Descrições e textos secundários          |
| `--text-light`    | `#c4907a` | Labels, dividers, placeholders           |

> A sombra é **tonal** (derivada do primary), não cinza neutro — reforça a identidade quente.

---

## Tipografia

| Função       | Font    | Peso    | Onde usar                                          |
| ------------ | ------- | ------- | -------------------------------------------------- |
| Logo         | Baloo 2 | 800     | Nome do app no header                              |
| Seções       | Baloo 2 | 700     | `<h1>` de seções, títulos de página                |
| Corpo        | Nunito  | 400–900 | Tudo mais: labels, descrições, botões, preços      |

Ambas do Google Fonts. Baloo 2 dá o caráter artesanal e quente sem perder legibilidade; Nunito garante hierarquia no restante.

### Logo — estrutura e tagline

O logo usa **Baloo 2 800** com duas cores e uma tagline em Nunito abaixo:

```html
<div class="logo">
  <div class="logo-text">Liváo<span>Store</span> 🍑</div>
  <span class="logo-tagline">doces artesanais</span>
</div>
```

```css
.logo-text {
  font-family: 'Baloo 2', cursive;
  font-size: 26px;
  font-weight: 800;
  color: #d96c4a;       /* "Liváo" em primary */
  line-height: 1;
  letter-spacing: -0.5px;
}
.logo-text span {
  color: #3d1f14;       /* "Store" em text-dark */
}
.logo-tagline {
  font-family: 'Nunito', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #c4907a;
  letter-spacing: 3px;
  text-transform: uppercase;
  display: block;
  margin-top: -2px;
  padding-left: 2px;
}
```

**Hierarquia de peso no Nunito:**

| Elemento     | Peso |
| ------------ | ---- |
| Preço        | 900  |
| Nome produto | 700  |
| Botão        | 700  |
| Descrição    | 400  |
| Label/badge  | 700  |
| Tagline logo | 700  |

---

## Padrões de Componentes

### Sombras

Todos os elementos elevados usam sombra **offset flat** (sem `blur`):

```css
box-shadow: 4px 4px 0 var(--shadow);      /* cards, panels */
box-shadow: 0 3px 0 var(--primary-dark);  /* botões primários */
```

Cards com hover ganham +1px na sombra e recuam 1px para cima/esquerda, simulando levitação sutil:

```css
.card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--shadow);
}
```

### Botões — Press Effect e Variantes

Todo botão clicável simula pressionar fisicamente. Existem três variantes:

**Primário** — ações principais (adicionar ao carrinho):
```css
background-color: #d96c4a;
color: #fff5f0;
border: 2px solid #8b3a24;
box-shadow: 0 3px 0 #8b3a24;

&:active {
  transform: translateY(3px);
  box-shadow: none;
}
```

**Interesse** — produto esgotado, cliente ainda não registrou interesse:
```css
background-color: #fce4da;
color: #6b2010;
border: 2px solid #e8a882;
box-shadow: 0 3px 0 #c4907a;

&:active {
  transform: translateY(3px);
  box-shadow: none;
}
```

**Done/Ghost** — estado final desabilitado (interesse já registrado):
```css
background-color: #f5ebe6;
color: #c4907a;
border: 1.5px solid #e8c9b8;
box-shadow: none;
cursor: default;
```

> **Regra crítica:** use hex explícito em todos os botões, nunca CSS variables do host. Em dark mode, variáveis como `--color-background-primary` viram fundos escuros, tornando texto branco invisível sobre branco.

### Bordas

Hierarquia por espessura — mesma cor, pesos diferentes:

- `2.5px` — cards, panels, CartBar (elementos principais)
- `2px` — header, botão outline, botão primário
- `1.5px` — badges, botão ghost/disabled

### Cards de Produto

Cards esgotados recebem `opacity: 0.7` no elemento inteiro — mais limpo do que alterar cor por elemento individualmente. Isso comunica indisponibilidade sem precisar de texto extra.

```css
.card-muted { opacity: 0.7; }
```

### Badges de Estoque

Três variantes visuais com pílula arredondada (border-radius: 20px) e ícone inline:

| Variante | Fundo      | Texto      | Borda      | Quando usar                        |
| -------- | ---------- | ---------- | ---------- | ---------------------------------- |
| Verde    | `#d1f0dc`  | `#1a6b35`  | `#86d4a8`  | `availableStock > 5`               |
| Laranja  | `#fce4da`  | `#6b2010`  | `#e8956a`  | `availableStock >= 1 && <= 5`      |
| Primary  | `#d96c4a`  | `#fff5f0`  | `#8b3a24`  | Badge "Voltou!" (reposição < 24h)  |

Posição: `absolute`, `top: 8px`, `left: 8px`, empilhados com `gap: 4px` quando houver dois badges simultâneos (ex: "Voltou!" + "✓ N disponíveis").

### Backgrounds dos Cards (imagem/emoji)

Cada categoria de produto tem um fundo suave distinto na área de imagem:

```css
/* tons derivados da paleta, sem saturação excessiva */
.bg-peach:  #fce4da   /* doces de chocolate */
.bg-amber:  #fde8c8   /* caramelos */
.bg-mint:   #e8f5e3   /* cítricos */
.bg-lilac:  #f5e0f5   /* frutas roxas/rosas */
.bg-sky:    #ddeaf8   /* outros */
```

### Dividers Decorativos — Pixel Art

Dividers usam SVG pixel art desenhado à mão com `<rect>` — cada quadrado é um retângulo posicionado num grid de `viewBox`. Três variantes em uso:

**Variante 1 — linha pontilhada + sprites** (principal, entre seções):
```html
<div class="divider">
  <div class="div-line"></div>
  <div class="div-sprites">
    <!-- coração, estrela, folha SVG — ver abaixo -->
  </div>
  <div class="div-line"></div>
</div>
```
```css
.divider {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin: 20px 0 16px;
}
.div-line {
  flex: 1; max-width: 80px; height: 2px;
  background: repeating-linear-gradient(
    to right,
    #f0c0aa 0px, #f0c0aa 6px,
    transparent 6px, transparent 10px
  );
}
```

**Variante 2 — texto pixel** (secundário, dentro de seções):
```html
<span style="font-family:'Press Start 2P',monospace; font-size:8px; color:#c4907a; letter-spacing:4px;">* * * * *</span>
```

**Variante 3 — tagline central com sprites** (rodapé da vitrine):
```html
<div class="divider">
  <div class="div-line"></div>
  <!-- sprite pêssego -->
  <span style="font-family:'Press Start 2P',monospace; font-size:7px; color:#c4907a;">✦ doces da lívia ✦</span>
  <!-- sprite pêssego -->
  <div class="div-line"></div>
</div>
```

> Press Start 2P (Google Fonts, open source) é usada apenas nos dividers de texto — nunca em títulos ou corpo. É pesada para leitura contínua mas perfeita para elementos decorativos curtos.

---

### Ícones Pixel Art — Sprites SVG

Sprites desenhados à mão com `<rect>` num `viewBox` pequeno (7×7 a 9×9px), renderizados em 12–16px com `image-rendering: pixelated`. Cores derivadas da paleta Peach Blossom.

**Como construir:** cada `<rect>` representa um pixel. `x` e `y` são a posição no grid, `width`/`height` geralmente `1` (um pixel). Pixels de highlight usam um tom mais claro do mesmo matiz.

**Coração** (8×8, usado nos dividers e seções de produto):
```svg
<svg width="16" height="16" viewBox="0 0 8 8" style="image-rendering:pixelated">
  <rect x="1" y="1" width="2" height="1" fill="#d96c4a"/>
  <rect x="4" y="1" width="2" height="1" fill="#d96c4a"/>
  <rect x="0" y="2" width="7" height="2" fill="#d96c4a"/>
  <rect x="1" y="4" width="5" height="1" fill="#d96c4a"/>
  <rect x="2" y="5" width="3" height="1" fill="#d96c4a"/>
  <rect x="3" y="6" width="1" height="1" fill="#d96c4a"/>
  <!-- highlight -->
  <rect x="1" y="2" width="1" height="1" fill="#f4a261"/>
  <rect x="4" y="2" width="1" height="1" fill="#f4a261"/>
</svg>
```

**Estrela/faísca** (9×9, usado ao lado de títulos de seção):
```svg
<svg width="12" height="12" viewBox="0 0 9 9" style="image-rendering:pixelated">
  <rect x="4" y="0" width="1" height="9" fill="#f4a261"/>
  <rect x="0" y="4" width="9" height="1" fill="#f4a261"/>
  <rect x="2" y="2" width="1" height="1" fill="#f4a261"/>
  <rect x="6" y="2" width="1" height="1" fill="#f4a261"/>
  <rect x="2" y="6" width="1" height="1" fill="#f4a261"/>
  <rect x="6" y="6" width="1" height="1" fill="#f4a261"/>
</svg>
```

**Folha** (8×8, usado nos dividers de rodapé):
```svg
<svg width="16" height="16" viewBox="0 0 8 8" style="image-rendering:pixelated">
  <rect x="3" y="0" width="1" height="1" fill="#5a8a4a"/>
  <rect x="3" y="1" width="2" height="1" fill="#5a8a4a"/>
  <rect x="2" y="2" width="4" height="1" fill="#7ab86a"/>
  <rect x="1" y="3" width="5" height="2" fill="#7ab86a"/>
  <rect x="2" y="5" width="3" height="1" fill="#5a8a4a"/>
  <rect x="3" y="6" width="1" height="2" fill="#5a8a4a"/>
  <!-- highlight -->
  <rect x="2" y="3" width="1" height="1" fill="#a0d48a"/>
</svg>
```

**Pêssego** (7×7, usado no divider de tagline):
```svg
<svg width="14" height="14" viewBox="0 0 7 7" style="image-rendering:pixelated">
  <rect x="2" y="0" width="3" height="1" fill="#f4a261"/>
  <rect x="1" y="1" width="5" height="1" fill="#f4a261"/>
  <rect x="0" y="2" width="7" height="2" fill="#f4a261"/>
  <rect x="1" y="4" width="5" height="1" fill="#d96c4a"/>
  <rect x="2" y="5" width="3" height="1" fill="#d96c4a"/>
  <rect x="3" y="6" width="1" height="1" fill="#8b3a24"/>
</svg>
```

**Onde usar sprites:**
- Divider principal da vitrine (coração + estrela + folha)
- Flancos do título de seção "Nossos doces" (estrela/faísca)
- Divider de rodapé (pêssego flanqueando tagline)
- Futuramente: badges especiais, loading states, empty states

### CartBar

Barra fixa na base da tela quando há itens no carrinho. Usa fundo primary sólido com sombra para cima:

```css
background-color: #d96c4a;
border-top: 2.5px solid #8b3a24;
box-shadow: 0 -3px 0 #8b3a24;
```

O botão interno usa fundo semitransparente sobre o primary — não branco nem outline:

```css
background-color: rgba(255, 245, 240, 0.2);
border: 2px solid rgba(255, 245, 240, 0.4);
color: #fff5f0;
box-shadow: 0 3px 0 rgba(0, 0, 0, 0.2);
```

### Textura de Fundo

`body::before` com SVG noise em `opacity: 0.035` — sutil mas adiciona profundidade orgânica ao fundo liso.

---

## Arquivo de Referência

`public/style-demo.html` — demo interativa com todos os esquemas de cor, componentes e tipografia. Contém também 4 esquemas alternativos (Spring Bloom, Lavender Honey, Butter Cream, Berry Jam) para referência futura se o tema mudar.
