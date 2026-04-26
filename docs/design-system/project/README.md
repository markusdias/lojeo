# Lojeo Design System

> Identidade do **sistema Lojeo** (motor SaaS + admin) — não dos templates de loja (jewelry, coffee), que terão sessões próprias.

**Lojeo** é um motor de e-commerce SaaS multi-tenant brasileiro voltado para MEI/PME, com **IA nativa profunda** como diferencial. Posicionamento: "Apple do e-commerce BR" — premium acessível, qualidade Linear/Vercel com calor brasileiro. Concorrentes: Shopify, Nuvemshop, Tray (todos sem IA real).

Esta identidade cobre a **marca corporativa Lojeo** + o **design system do admin** que todos os lojistas vêem. Storefronts seguem identidades dos templates (camada separada).

## Fontes

- **Codebase de referência:** `lojeo/` (mounted via File System Access)
  - `lojeo/CLAUDE.md` — princípios e camadas
  - `lojeo/docs/design-briefs/A-lojeo-system-identity.md` — briefing detalhado da marca/admin
  - `lojeo/docs/design-briefs/C-ai-features-admin-lojeo.compact.md` — extensão IA no admin
  - `lojeo/ecommerce-requisitos-v1.3.md` — documento balisador de produto
- **Status:** pré-código. Este design system é o primeiro entregável visual do projeto.

---

## Index

| Arquivo | O que é |
|---|---|
| `colors_and_type.css` | Tokens completos (cores, tipo, espaçamento, raios, sombras, motion). Tailwind v4 compatível. |
| `assets/lojeo-logo.svg` | Logo principal (símbolo + wordmark) — light bg |
| `assets/lojeo-logo-dark.svg` | Variante dark bg |
| `assets/lojeo-logo-mono.svg` | Monocromático preto |
| `assets/lojeo-mark.svg` | Símbolo isolado (favicon, app icon) |
| `preview/` | 21 cards visuais (cores, tipo, spacing, components, brand) |
| `ui_kits/admin/` | UI kit do admin: dashboard, pedidos, produtos, login |
| `SKILL.md` | Skill cross-compatible com Claude Code |

---

## Marca

**Wordmark:** `lojeo` — sempre **minúsculas** (humilde, acessível, moderno). Origem semântica: "loja" + "eu" → "minha loja".

**Símbolo:** quadrado com canto inferior-esquerdo arredondado (abrigo/loja abstrato) + ponto orgânico que evoca o pingo do "j". Geométrico, abstrato, NÃO usa carrinho/sacola/etiqueta. Inspiração: Vercel ▲, Linear ◢, Stripe ≋.

**Variantes:** full lockup, wordmark-only, símbolo-only, light bg, dark bg, monocromático preto/branco.

---

## Content Fundamentals

### Tom de voz

- **Português brasileiro real**, nunca traduzido do inglês.
- **"Você"** formal-amigável (não "tu", não "vós").
- **Ativo, direto, esperançoso.** Stripe (técnico-claro) + iFood (BR-amigável). Não infantilizar.

### Microcopy padrão

| Estado | Como falar | Não falar |
|---|---|---|
| Sucesso | "Tudo certo!", "Vendido!", "Pronto, está no ar." | "Sucesso!", "Yay!", "queridinha" |
| Erro | "Não rolou — vamos tentar de novo?", "Hmm, deu ruim por aqui. Tenta isto:" | "Erro: 500", "Falha de sistema" |
| Vazio | "Ainda nada por aqui — comece criando seu primeiro produto." | "Sem dados" |
| Loading | "Um instante…" | "Loading…" |
| CTA | "Conectar Mercado Pago em 1 clique", "Publicar agora" | "Submit", "Enviar formulário" |

### Casing & punctuation

- Sentence case em UI (botões, headers, labels). Nunca Title Case nem ALL CAPS exceto no eyebrow (caption uppercase com tracking 0.04em).
- Sem ponto final em labels curtas e CTAs. Ponto final em mensagens completas.
- Aspas tipográficas curvas em texto longo. Travessão (—) preferível a hífen (-) em diálogo.
- Numerais: separador decimal vírgula, milhar ponto. Moeda: `R$ 4.280,90` (com espaço).

### Sem emoji por padrão

Emoji apenas onde ajuda contextualmente (ex: "👋" em saudação no dashboard, "✨" no AI badge). Nunca como decoração de empty state, nunca em error.

### Vibe

Caloroso mas profissional. O lojista é **um adulto competente que merece respeito** — não um iniciante que precisa de tutorial infantil. Temos confiança no produto: "vendido!" é uma celebração simples, não uma festa.

---

## Visual Foundations

### Paleta

Monocromática + 1 accent. Filosofia Apple: deixe o conteúdo respirar; cor é informação, não decoração.

- **Paper** `#FAFAF7` — off-white **quente** (não branco frio gringo). Background padrão.
- **Surface** `#FFFFFF` — cards, modais elevados.
- **Cinzas:** escala 50→900 (`#F5F5F5` → `#0A0A0A`). 11 stops para hierarquia.
- **Accent:** **Verde profundo brasileiro** `#00553D` (hover `#007A57`, pressed `#00302A`, soft tint `#E6EFEC`). Conota dinheiro, sucesso, mata atlântica. Diferencia de "azul SaaS" gringo.
- **Semânticas:** Success `#10B981` · Warning `#F59E0B` · Error `#EF4444` · Info `#3B82F6`. Cada uma com `*-soft` para backgrounds de badge/alert.

### Tipografia

- **Inter** (sans, variable 400/500/600/700) — display + body. Suporte português perfeito. Features ativas: `cv11` (alt 1), `ss03` (single-storey g).
- **JetBrains Mono** — IDs, valores monetários, SKUs, datas, código. Sempre com `tabular-nums`.
- Pesos usados: 400, 500, 600, 700. **Evitar 900.**
- Tracking: tight (-0.02em a -0.025em) em displays/headings; normal (-0.005em a -0.01em) em body; wide (0.04em) em eyebrows uppercase.

### Espaçamento

- **Base 4px**, escala generosa Stripe-style. Tokens: 0/1/2/3/4/5/6/8/10/12/16/20/24 (× 4px).
- Densidade padrão: **espaçoso**. Modo "compacto" opcional em listas/tabelas.

### Border radii

`xs 4px` · `sm 6px` · `md 8px` (default inputs/buttons) · `lg 12px` (cards) · `xl 16px` (modals, hero cards) · `2xl 20px` · `full ∞` (badges, pills, avatars).

### Sombras

Sistema de 5 níveis, **muito suaves** (qualidade premium, não "drop-shadow tutorial"):

```
xs → border ghosting (1px, 4% black)
sm → cards padrão (1-3px, 5%)
md → popovers, dropdowns (2-8px, 6%)
lg → drawers, side panels (4-24px, 8%)
xl → modais centrais (12-48px, 12%)
focus → 3px ring usando --accent-ring (rgba 25%)
```

### Backgrounds & imagery

- **Sem stock photos no admin.** Admin é puro UI.
- **Sem ilustrações cartoon, 3D, mascote ou personagem.** Marca é abstrata.
- **Gradientes apenas em AI badges** — sutil, do accent para tom análogo (`#00553D → #34C796`). NUNCA roxo/rosa estilo ChatGPT.
- Capas e empty states usam **iconografia line + texto**, não illustration.

### Borders

- Default: `1px solid var(--border)` (`#E5E5E5`).
- Strong: `1px solid var(--border-strong)` (`#D4D4D4`) para inputs, chips, ações.
- Dashed `#D4D4D4` apenas em zonas de drop / empty states.

### Cards

- Background: `var(--surface)` (branco puro).
- Border: 1px `--border`.
- Radius: 12px.
- Shadow: `--shadow-xs` no rest. Hover sobe pra `--shadow-sm` (cards interativos).
- Header com `border-bottom 1px var(--border)`, padding 16px 20px. Body padding 20px.

### Hover & press

- **Botões primary:** rest `#00553D` → hover `#007A57` (mais claro) → press `#00302A` (mais escuro).
- **Botões secondary/ghost:** rest transparent → hover `var(--neutral-50)`.
- **Linhas de tabela:** rest transparent → hover `var(--neutral-50)`. Cursor pointer quando navegáveis.
- **Cards interativos:** sobem 1 nível de shadow (xs → sm) e mantêm posição. Sem `translateY` agressivo.
- **Press:** color shift, sem `scale()`. Ícones podem ter `scale(0.96)` discreto se for icon-button.

### Focus

`box-shadow: 0 0 0 3px var(--accent-ring)` (rgba(0,85,61,0.25)). Ring sempre visível, **WCAG 2.1 AA** mínimo. Nunca remover outline sem oferecer alternativa.

### Motion

- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (out, "Apple-feel") para entradas; `cubic-bezier(0.65, 0, 0.35, 1)` para movimento bidirecional.
- **Durations:** fast `120ms` (hover, color), base `180ms` (popover, drawer slide), slow `240ms` (modal).
- **Sem bounces, sem springs exagerados.** Tudo discreto. AI generation usa skeleton shimmer + barra de progresso real, NUNCA spinner girando indefinidamente.

### Transparency & blur

- Topbar e sidebar **sem blur** (não são overlays).
- Modais usam backdrop `rgba(10,10,10,0.5)` puro, sem blur.
- Glassmorphism **não é usado.** Estética Lojeo é definida e clara, não atmosférica.

### Layout

- **App shell:** sidebar 248px (collapsed 64px) + topbar 56px. Main padding 32px.
- **Container max:** 1200px para conteúdo de leitura; tabelas e dashboards usam toda a largura disponível.
- Grids usam `gap` (16px / 24px), nunca margens manuais.

### Color vibe das imagens

Quando há fotos (admin não tem; templates têm), tendem a **warm** (off-white quente sustenta isso). Sem grain, sem black & white, sem vintage. Limpo, natural, com sombras suaves.

---

## Iconography

- **Sistema:** [Lucide](https://lucide.dev) — line icons, **stroke-width 1.5px**, **monocromáticos**. Tamanhos: 16/20/24/32px.
- **Não usar** ícones cheios coloridos, Heroicons solid, ícones 3D, emoji como ícone de UI.
- **Fontes próprias:** o codebase ainda não tem ícones (pré-código). Os ícones em `preview/brand-icons.html` e nos UI kits são SVGs inline desenhados a mão **seguindo as specs de Lucide** (mesma stroke, mesmas proporções) — substituir por Lucide oficial quando o package for instalado.
- **Decisão de substituição:** estamos usando SVGs desenhados a mão como placeholder Lucide-compatible. Quando `lucide-react` for instalado em `packages/ui/`, importar os ícones oficiais com nome 1:1.
- **Emoji:** raríssimo. Aprovados: 👋 saudação no dashboard, ✨ AI badge. Tudo mais é ícone.
- **Unicode chars:** ▲▼ em deltas de KPI (mais compacto que ícone). `→` em "Ver todos →" e CTAs sutis.

---

## UI kits

- **`ui_kits/admin/`** — admin Lojeo. Dashboard, lista+detalhe de pedido, lista de produtos, login OAuth. Click-thru no canto superior direito.

## Slides

Não foram entregues templates de slide nesta sessão. (Serão briefados separadamente se necessário.)

---

## Caveats & próximos passos

Veja `SKILL.md` para uso programático e `ui_kits/admin/README.md` para gaps específicos do admin.

## Substituições sinalizadas

- **Inter & JetBrains Mono:** carregadas via Google Fonts CDN (não há arquivos locais em `fonts/`). Ambas são free e oficiais — não há substituição. Se você quiser servir self-hosted, baixe de [rsms.me/inter](https://rsms.me/inter/) e [jetbrains.com/mono](https://www.jetbrains.com/mono/).
- **Lucide icons:** desenhados a mão como placeholders Lucide-compatible. Substituir por `lucide-react` oficial em produção.
