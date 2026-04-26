# Auditoria Componentes Design System vs Implementação

**Data:** 2026-04-26
**Auditor:** Claude Code (auditoria pré-componentes)
**Escopo:** 42 preview HTML files (21 Lojeo admin + 21 jewelry-v1 storefront) versus implementação real em `apps/admin/src/`, `apps/storefront/src/` e `templates/jewelry-v1/src/tokens.css`.

---

## Sumário

- **42 / 42 preview HTMLs auditados**
- Tokens CSS: **100% definidos** em ambos os sistemas (`apps/admin/src/styles/lojeo-tokens.css` e `templates/jewelry-v1/src/tokens.css`)
- Componentes Lojeo admin: **~85% paridade** (gap principal: toasts e metric-cards não componentizados)
- Componentes jewelry-v1 storefront: **~55% paridade** (gap principal: zero classes utilitárias `.btn`/`.b-*`/`.chip`/`.swatch`/`.review` usadas — tudo via inline styles e SVG ad hoc)
- Tokens jewelry-v1 quebram para `text-muted` (override em `globals.css` por motivo de WCAG AA — documentado mas inconsistente)

### Observação metodológica importante

Os preview HTMLs **não definem o nome final das classes** que vão para produção — eles usam prefixos genéricos (`.btn`, `.card`, `.toast`, `.empty`, `.b`, `.chip`, `.swatch`, `.review`) como specs visuais. A implementação real usa:
- Admin: prefixo `.lj-*` (em `apps/admin/src/app/globals.css`)
- Storefront jewelry-v1: **nenhuma classe utilitária canônica** — todos os componentes usam `style={{}}` inline com `var(--*)` tokens.

A paridade aqui é avaliada em três níveis: (1) token existe, (2) padrão visual implementado em algum lugar, (3) componente reutilizável existe.

---

## Admin Lojeo

### Brand & Identity

| Preview | Token | Padrão visual | Componente | Status |
|---|---|---|---|---|
| `brand-icons.html` | n/a (SVGs inline 1.5px stroke) | usado em sidebar/topbar | sem componente `<Icon>` central no admin | ⚠️ Padrão correto, mas SVGs duplicados em cada arquivo (sidebar.tsx, topbar.tsx) — falta componente central |
| `brand-logo.html` | `--accent`, `--paper` | n/a | sem componente `<Logo>` no admin | ❌ Logo Lojeo **não implementada** — nenhum SVG/componente da marca corporativa |
| `brand-voice.html` | n/a (guideline textual) | n/a | n/a | ✅ Guideline (não exige código) |

### Cores

| Preview | Tokens | Status |
|---|---|---|
| `colors-accent.html` | `--accent`, `--accent-hover`, `--accent-pressed`, `--accent-soft`, `--accent-ring` | ✅ Todos definidos em `lojeo-tokens.css:25-29` |
| `colors-neutrals.html` | `--paper`, `--surface`, `--neutral-50…900` | ✅ Todos definidos `lojeo-tokens.css:11-22` |
| `colors-semantic.html` | `--success`, `--warning`, `--error`, `--info` (+ soft variants) | ✅ Definidos `lojeo-tokens.css:32-39` |
| `colors-themes.html` | dark mode via `[data-theme='dark']` | ⚠️ Tokens dark **definidos** (`lojeo-tokens.css:132-166`) mas **nenhum toggle/switcher implementado** no admin — `data-theme` nunca é setado |

### Tipografia

| Preview | Tokens | Componente | Status |
|---|---|---|---|
| `type-display.html` | `--text-display-2xl/xl/l` + classes `.display-2xl/xl/l` | classes definidas em `lojeo-tokens.css:194-196` | ⚠️ Classes existem; uso real: `display-2xl` 3×, `display-xl` 3×, `display-l` 2× — quase só na landing |
| `type-families.html` | `--font-sans` (Inter), `--font-mono` (JetBrains Mono) | importadas em `lojeo-tokens.css:7` | ✅ |
| `type-scale.html` | `--text-h1…h4`, `--text-body-l/body/body-s`, `--text-caption` + classes `.body-s`, `.caption`, `.eyebrow`, `.numeric`, `.mono` | definidas `lojeo-tokens.css:198-210` | ✅ Uso intenso: `body-s` 2.908×, `caption` 629×, `eyebrow` 411×, `numeric` 343×, `mono` 229× |

### Componentes UI

| Preview | Spec | Implementação | Status |
|---|---|---|---|
| `components-buttons.html` | primary (verde), secondary, ghost, destructive, destructive-solid | `.lj-btn-primary`, `.lj-btn-secondary`, `.lj-btn-danger` em `globals.css:40-77` | ⚠️ **Falta `ghost` e `destructive-solid`**. Spec tem 5 variantes, implementação tem 3 |
| `components-badges.html` | success, warn, err, info, neutral, accent, ai (gradient), oauth | `.lj-badge`, `.lj-badge-{accent,success,warning,error,info,neutral}` em `globals.css:95-109` | ⚠️ Falta variante **AI gradient** e **OAuth** dot-indicator |
| `components-inputs.html` | input + label + hint + error states + input-icon | `.lj-input` em `globals.css:79-93` | ⚠️ Estilo visual OK, mas **sem componente React** com estados (`error`, `hint`, `input-icon` não modeladas) |
| `components-metric-cards.html` | label + value mono + delta up/down + sparkline | sparkline existe (`MiniChart.tsx:Sparkline`); metric-card como **componente reutilizável NÃO existe** | ❌ Cada page do dashboard repete markup do metric-card. Sparkline OK, mas falta `<MetricCard label value delta sparkline />` |
| `components-table.html` | `.table` + `<thead>` styling + `.badge` inline + `.dot` + col mono | **nenhum componente `<DataTable>` existe**. Tables são `<table>` raw em cada page | ❌ Zero componentização. 5+ tabelas no admin replicam padrão |
| `components-toasts.html` | success/warn/err/info com border-left colorido + ícone + título + msg + `×` | **componente toast NÃO existe** no admin | ❌ Único uso de "toast" encontrado é `role="alert"` ad-hoc, sem container visual |
| `components-empty-state.html` | card dashed border + ícone + h3 + p + CTA | `EmptyState.tsx` em `apps/admin/src/components/ui/empty-state.tsx` | ✅ Implementado recentemente; uso confirmado em 4 arquivos |
| `components-ai.html` | hero gradient sutil + badge "✨ IA" + cost meter | `.lj-ai-banner`, `.lj-ai-eyebrow` em `globals.css:223-240` + `--ai-gradient`, `--ai-gradient-soft` tokens | ⚠️ Banner OK; **cost-meter (bar progress)** não componentizado |

### Spacing / Radii / Shadows

| Preview | Tokens | Status |
|---|---|---|
| `spacing-scale.html` | `--space-0…24` | ✅ Definidos `lojeo-tokens.css:86-98` |
| `spacing-radii.html` | `--radius-xs/sm/md/lg/xl/2xl/full` | ✅ Definidos `lojeo-tokens.css:101-107` |
| `spacing-shadows.html` | `--shadow-xs/sm/md/lg/xl` + `--shadow-focus` | ✅ Definidos `lojeo-tokens.css:110-115`. Uso real: 12 ocorrências (`shadow-xs` 3×, `md` 3×, `xl` 2×, `sm/lg` 2× cada) |

---

## Storefront jewelry-v1

### Identidade Visual

| Preview | Token | Componente | Status |
|---|---|---|---|
| `logo.html` | `--bg`, `--text-primary` | sem componente; `<Header>` renderiza `storeName` em texto puro com `--font-display` | ⚠️ Sem SVG/wordmark — apenas texto. `assets/logo-placeholder.svg` é placeholder do preview |
| `iconography.html` | n/a (SVG 1.5px stroke 24×24) | `apps/storefront/src/components/ui/icon.tsx` (componente `<Icon>`) | ✅ Componente central existe com 24+ ícones |
| `voice.html` | guideline textual | n/a | ✅ Guideline (não exige código) |

### Tipografia

| Preview | Tokens | Status |
|---|---|---|
| `type-combo-a.html` (Cormorant Garamond + Inter) | `[data-typo="a"]` em `tokens.css:193-202` | ✅ Default ativo (`layout.tsx:65` aplica `data-typo="a"`) |
| `type-combo-b.html` (Playfair Display + Source Sans 3) | `[data-typo="b"]` em `tokens.css:204-213` | ✅ Token preset existe; uso real ainda não há (só combo A) |
| `type-combo-c.html` (Inter + JetBrains Mono) | `[data-typo="c"]` em `tokens.css:215-231` | ✅ Token preset existe |
| `type-ramp.html` | `--fs-eyebrow…--fs-display`, `--lh-tight…relaxed` | ✅ Definidos `tokens.css:169-186`. Combo A reflete na home/PDP via `var(--font-display)` 17×, `var(--font-body)` 7× |

### Cores & Background

| Preview | Tokens | Status |
|---|---|---|
| `colors-accents.html` (champagne/silver/rose-gold/copper/noir-rose) | `[data-accent="..."]` em `tokens.css:258-282` | ✅ 5 presets. `champagne` é o default |
| `colors-neutrals.html` | `--color-paper-warm/pure/cool/cream`, `--color-ink-100…900` | ✅ Definidos `tokens.css:31-40` |
| `colors-semantic.html` | `--color-success/error/warning` + bg | ✅ Definidos `tokens.css:53-58` |
| `bg-tones.html` (warm/pure/cool/cream) | `[data-bg-tone="..."]` em `tokens.css:288-303` | ✅ Default `warm`; uso real só `warm` |

### Spacing / Radius / Shadows

| Preview | Tokens | Uso real | Status |
|---|---|---|---|
| `spacing.html` | `--sp-0…--sp-40` | quase **zero** — código usa hardcode `padding: 18`, `gap: 24` | ⚠️ Tokens existem mas storefront não os usa — números mágicos espalhados |
| `radius.html` | `--r-none/sm/md/lg/xl/pill` + `--r-image` | `--r-image` usado 4× (product-card); resto raríssimo | ⚠️ Idem — `borderRadius: 8` hardcoded em vez de `var(--r-md)` |
| `shadows.html` | `--shadow-sm/md/lg/image` | uso real: **1 ocorrência** (`var(--shadow-lg)` no menu da Header) | ❌ Quase não usados — sombras inline ou ausentes |

### Componentes UI

| Preview | Spec | Implementação | Status |
|---|---|---|---|
| `buttons.html` | btn-primary, btn-accent, btn-ghost, btn-link, btn-disabled (5 variantes) | **nenhuma classe `.btn-*` existe** em produção. Botões inline: `<button style={{ padding, background: 'var(--text-primary)' }}>` em ~24 lugares | ❌ Zero componentização. Padrão visual replicado mas inconsistente (alguns usam `border-radius: 6`, outros `8`, alguns `4`) |
| `badges.html` | b-new, b-best, b-low, b-out, b-sale, b-tag (6 variantes) + grupo "urgência" | sem classes; `product-card.tsx:54-62` tem badge desconto inline | ❌ Apenas 1 variante implementada (desconto), faltam 5 do spec + faixa de urgência |
| `form-inputs.html` | label uppercase eyebrow + input border-radius:2px + select + estado erro | `review-section.tsx` tem `inputStyle` constante; `newsletter-form.tsx` próprio. **Sem componente `<Input>`** | ❌ Estilos divergentes em cada lugar, nenhuma classe canônica |
| `product-card.html` | aspect 1/1 + badge top-left + nome `var(--font-display)` + price | `product-card.tsx`: aspect **3/4** (não 1/1), badge desconto top-left **OK**, nome usa `font: 14, fontWeight: 400` (NÃO display) | ⚠️ Visualmente diferente do spec — aspect ratio e tipografia divergem |
| `review-card.html` | grid 80px+1fr, foto, ★ stars accent, quote display itálico, verified eyebrow success | `review-section.tsx`: lista vertical sem foto, stars cor hard-coded `#C9A85C` (não `var(--accent)`), sem layout 2-col, sem quote display | ❌ Layout completamente diferente do spec |
| `trust-signals.html` | 4 itens com ícone SVG + label + descrição (Garantia/Frete/Embalagem/Trocas) | `app/page.tsx:20-25,159-173`: usa **glyphs Unicode `✦◈◉⬡`** em vez de SVGs, sem descrição secundária | ⚠️ Spec quer SVG icons (shield/truck/gift/return); implementação usa caracteres especiais |
| `variant-chips.html` | swatch circular accent border + chip rect com active/disabled | **não implementado**. PDP cliente ainda não tem variant selector visual | ❌ Faltante — bloqueia variantes ricas em PDP |

---

## Gaps consolidados

### Crítico (bloqueante para próximas features)

1. **Storefront sem componentes utilitários** — 100% inline styles. Sem `<Button>`, `<Badge>`, `<Input>`, `<Chip>`, `<Swatch>`, `<TrustItem>`, `<ReviewCard>`. Cada nova feature replica markup → débito técnico crescente.
2. **Admin sem `<Toast>`, `<MetricCard>`, `<DataTable>`** — três padrões mais usados em qualquer admin SaaS, todos não componentizados. Specs (`components-toasts.html`, `components-metric-cards.html`, `components-table.html`) existem.
3. **Variant chips/swatches faltantes** (PDP jewelry) — bloqueiam venda de variantes ricas (material, aro). Spec `variant-chips.html` definido, zero implementação.
4. **Review card divergente do spec** — `review-section.tsx` mostra reviews em layout linear sem foto, sem quote display, com cor de estrela hard-coded fora dos tokens.

### Médio (prejudica consistência visual)

5. **Botões storefront variantes ausentes** — `btn-accent`, `btn-ghost`, `btn-link`, `btn-disabled` não existem. Apenas variante "primary preto" em uso ad hoc.
6. **Badges storefront variantes ausentes** — 5 de 6 specs faltam (apenas desconto implementado).
7. **Trust signals usam Unicode em vez de SVGs** (`page.tsx:20-25`) — quebra alinhamento visual com spec; ícones do `iconography.html` (shield/truck/gift) não usados.
8. **Tokens `--sp-*`, `--r-*`, `--shadow-*` do jewelry-v1 quase nunca consumidos** — código storefront usa números mágicos, anula propósito do design system.
9. **Logo Lojeo (admin) não implementada** — sem componente `<LojeoLogo>`, marca corporativa ausente do admin.
10. **Dark mode admin tokens existem mas sem switcher** — `[data-theme='dark']` nunca é aplicado.

### Cosmético / refinamento

11. **Botão admin: faltam variantes `ghost` e `destructive-solid`** (3 de 5 implementadas).
12. **Badge admin: faltam variantes `AI gradient` e `OAuth dot`** (6 de 8 implementadas).
13. **AI cost-meter** (`components-ai.html`) não componentizado (banner sim, meter não).
14. **Sparkline integrada manualmente em metric-cards** — funciona mas falta wrapper `<MetricCard>`.
15. **Storefront text-muted override** (`globals.css:36-39`) sobrescreve token original do template por motivo de contraste WCAG — solução pragmática, mas cria duas verdades. Documentar no DECISION_LOG.

---

## Plano de fix sugerido (ordem recomendada)

1. **Storefront — extrair `<Button>` e `<Badge>` componentes** com 5 e 6 variantes do spec; refatorar `app/page.tsx`, `header.tsx`, `pdp-client.tsx` para usar (alto impacto, baixo risco).
2. **Storefront — `<TrustSignal>` componente** com SVG icons (shield/truck/gift/return) puxados do `iconography.html`.
3. **Storefront — `<VariantChip>` e `<VariantSwatch>`** para PDP (desbloqueia roadmap de variantes).
4. **Admin — `<Toast>` + provider + hook** (`useToast()`); `<MetricCard label value delta sparkline />`; `<DataTable columns rows />` mínima.
5. **Storefront — refatorar `<ReviewCard>`** seguindo spec `review-card.html` (layout 2-col, foto, quote display, ★ via `var(--accent)`).
6. **Admin — adicionar variantes faltantes**: `lj-btn-ghost`, `lj-btn-danger-solid`, `lj-badge-ai`, `lj-badge-oauth`.
7. **Admin — componente `<LojeoLogo>`** (SVG corporativa) + injetar na sidebar.
8. **Storefront — substituir números mágicos** por `var(--sp-*)`, `var(--r-*)`, `var(--shadow-*)` (sweep guiado por ESLint custom rule).
9. **Admin — theme switcher dark/light** ou remover tokens dark se não for usar na Fase 1.

---

## Arquivos-chave referenciados

- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/admin/src/styles/lojeo-tokens.css` (211 linhas, todos os tokens admin)
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/admin/src/app/globals.css` (243 linhas, todas as classes `.lj-*`)
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/app/globals.css` (86 linhas, mínimo)
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/templates/jewelry-v1/src/tokens.css` (411 linhas, todo o design system jewelry-v1)
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/admin/src/components/ui/empty-state.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/admin/src/components/ui/mini-chart.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/admin/src/components/layout/topbar.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/components/ui/icon.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/components/ui/product-card.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/components/reviews/review-section.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/components/layout/header.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/components/layout/footer.tsx`
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/app/layout.tsx` (data-typo/data-accent setup)
- `/Volumes/HDextMacMini/projetos-DEV/lojeo/apps/storefront/src/app/page.tsx` (trust signals + hero)
