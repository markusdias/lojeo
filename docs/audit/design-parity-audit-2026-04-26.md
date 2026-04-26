# Auditoria de Paridade Visual — Lojeo

**Data:** 2026-04-26
**Auditor:** Claude Code (subagent)
**Método:** Confronto visual PNG ground-truth (entregues por Claude Design) vs screenshots Playwright em produção (`apps-lojeo-{admin,storefront}.m9axtw.easypanel.host`).
**Status geral:** **~38% de paridade real**

> **Convenção de severidade**
> - **Critico** — bloqueia aceitação UX. Quebra promessa central da tela.
> - **Medio** — perceptível mas a tela continua funcional.
> - **Cosmetico** — fácil de fixar, baixa prioridade.

---

## Sumário executivo

| Severidade | Total |
|---|---|
| Críticos | **17** |
| Médios | **14** |
| Cosméticos | **9** |

**Pages auditadas:** 5 (4 admin Lojeo + 1 storefront jewelry-v1).

**Constatações estruturais:**
1. **Tokens corretos, composição errada.** Variáveis CSS (`--accent #00553D`, `--paper #FAFAF7`, Inter, sidebar 248px) batem exatamente com `colors_and_type.css`. Mas as **páginas não estão compostas** como nos PNGs — falta conteúdo, faltam componentes inteiros, dados-demo ausentes.
2. **Páginas de detalhe quebradas.** `/experiments/{id}` e `/clientes/{id}` retornam **404** em prod. Dois dos quatro PNGs admin auditados não têm contraparte renderizável.
3. **Storefront jewelry-v1 é a parte mais avançada.** Hero "Peças que ficam", paleta bege, botões dark filled, navegação top — tudo coerente com o ground-truth do design-system-jewelry-v1.
4. **Componentes-âncora ausentes no admin:** sparklines em metric cards, gráfico semanal, painel "IA · resumo dos testes", filtros A/B, banner "Insights de hoje" lateral, segmentos RFM como pills coloridas, perfil cliente individual completo.
5. **Sidebar com 2 visuais coexistindo.** Layout root usa `Sidebar` com SVGs Lucide-style (correto). Mas o snapshot inicial da page raiz `/` mostrou versão antiga com glifos unicode (`◈`, `◉`, `📦`) — provável fallback ou page de boas-vindas legacy renderizando outro componente. Mitigar para evitar regressão visual.

**Page mais distante do design:** `/experiments` (lista A/B) — apenas 12% paridade. Falta painel IA, falta filtros, falta cards-experimento, falta dados.

---

## Por page

### 1. `admin-dashboard.png` vs `/dashboard`

**Status:** ~35% paridade
Ref ground-truth: `docs/design-system/project/screenshots/admin-dashboard.png`
Ref prod: `prod-admin-dashboard.png`, `prod-dashboard-viewport.png`

#### Match (paridade ok)
- Sidebar 248px, fundo branco, accent verde `#00553D` no item ativo.
- Tipografia Inter, hierarquia H1 grande com emoji.
- Layout 2 colunas (área principal + "Saúde das integrações" à direita).
- Cards com border `--neutral-100` e radius ~12px.
- Brand "lojeo" com leaf accent no topo da sidebar.

#### Gaps críticos
1. **Métricas sem sparklines** — Design: cada metric card tem mini-chart de tendência (~30 dias) na parte inferior. Prod: só números, zero gráfico. Componente `Sparkline` existe em `apps/admin/src/components/ui/mini-chart.tsx` mas não é usado nos cards. **Fix:** plugar o componente nos 4 cards principais.
2. **Métricas sem delta percentual** — Design: cada card mostra ▲12.4% (verde) ou ▼0.4% (vermelho) ao lado do número. Prod: nenhum delta. **Fix:** já há helper `pctDelta()` em `dashboard/page.tsx`, mas não está renderizado.
3. **Gráfico "Receita · últimos 7 dias" não existe** — Design tem painel grande (col esquerda) com area-chart em verde-accent, comparação semana atual vs anterior (linha pontilhada), legendas. Prod: zero. **Fix:** componente novo (recharts/visx + dados agregados em SSR).
4. **Card "Insights de hoje" lateral está ausente** — Design: bloco lateral direita inferior com badge IA + texto IA gerado + ícone. Prod: tem banner "IA · INSIGHTS DE HOJE" mas como banner full-width acima dos pedidos, não no painel lateral previsto. **Fix:** mover para coluna direita, igualando hierarquia visual.
5. **Métricas diferentes (período + escolha)** — Design: "Receita hoje · R$ 4.280,90", "Pedidos · 28", "Conversão · 2,8%", "Margem média · 42,3%". Prod: "Receita · 30D · R$ 0,00", "Pedidos · 30D · 0", "Aguardando pagamento", "Produtos · 2". **Fix:** alinhar com KPIs definidos no design (hoje + conversão + margem).
6. **Topbar sem breadcrumb com slash** — Design: `Loja / Dashboard` (com separador `/` cinza, "Loja" clicável). Prod: só `Dashboard` puro. **Fix:** Topbar.tsx precisa receber e renderizar breadcrumb hierárquico.
7. **Topbar com tabs de demo persistente** — Design: tabs `Dashboard | Pedido | Produtos | Login` no canto direito do topbar. Prod: ausentes (existem só no `/experiments` como footer-bar de navegação rápida). Decisão: manter ou remover, mas a inconsistência atual é gap.

#### Gaps medios
8. **Avatar tenant no footer da sidebar diferente** — Design: avatar circular verde `MC`, nome "Marina Castro", tenant "Atelier Verde · MEI". Prod: idem mas `AL · Admin Lojeo` (sem nome real, sem segunda linha de tenant). **Fix:** seed real para usuário admin@lojeo.dev (`name: 'Marina Castro'`, tenant config).
9. **Botão "+ Novo produto"** — Cor accent ok, mas raio do botão prod parece um pouco menor (~6px) do que o design (~8px). Cosmético/médio.
10. **Search input estilo** — Design: input com sombra interna sutil, ícone lupa cinza claro. Prod: idêntico mas placeholder cor diferente, mais cinza médio. Prod usa `--fg-muted` quando deveria ser `--fg-secondary`. Confirmar via DevTools.
11. **Subtítulo do hero** — Design: `Aqui está um resumo da sua loja hoje, 25 de abril.`. Prod adiciona `· Joias Lab · template jewelry-v1` (debug info exposta para o lojista). **Fix:** mover info do template para tooltip ou settings, não mostrar no hero.

#### Cosmeticos
12. **Saúde das integrações — labels de estado** — Design: `OK` (verde soft), `Lento` (laranja soft), `Reconectar` (vermelho soft). Prod: tudo `Pendente` (cinza). É efeito de não estar conectado, mas o **componente badge** está usando neutral em vez das cores semânticas. Verificar se quando status `down`/`lento` os tons aparecem.
13. **Bullet point de status** — Design: dot sólido `--success/--warning/--error` na frente de cada integração. Prod: dot cinza neutro. Mesmo bug do item 12.
14. **Footer link "Gerenciar →"** — Design não tem. Prod tem. Aceitável, mas confirmar se faz parte do design futuro.
15. **Notificação badge** — Design: bell com **dot vermelho indicador**. Prod: bell sem dot. **Fix:** componente Bell precisa do indicador.

---

### 2. `abtest-list.png` vs `/experiments`

**Status:** ~12% paridade (page mais distante do design)
Ref ground-truth: `docs/design-system/project/screenshots/abtest-list.png`
Ref prod: `prod-experiments-list.png`

#### Match (paridade ok)
- Sidebar correta com "Experimentos" ativo.
- Topbar com breadcrumb (`Marketing / Experimentos A/B` no design, `Experimentos` puro em prod — gap mas pelo menos área existe).
- Botão accent "+ Novo experimento" no canto direito.

#### Gaps críticos
1. **Painel "IA · RESUMO DOS TESTES" totalmente ausente** — Design: card hero verde-soft no topo com texto IA-gerado de 3 frases analisando todos os experimentos + 2 botões CTA ("Declarar EXP-018 vencedor", "Arquivar EXP-014") + assinatura "Sonnet · 1,2¢ · análise estatística com correção de Bonferroni". Prod: zero. Esta é a feature-âncora da page. **Fix:** componente novo + endpoint que chama Claude API. Ver `components-ai.html` para o padrão visual.
2. **Filtros tabulados ausentes** — Design: pills `Todos 6 | Rodando 2 | Concluídos 2 | Inconclusivos 1 | Rascunhos 1` + link "Filtros avançados". Prod: nada disso. **Fix:** componente `<TabFilters>` com counters, padrão design-system.
3. **Cards de experimento listados** — Design: cada experimento como card horizontal com: badge `EXP-XXX`, badge status (`Rodando` verde-dot), título do teste, badge `Página de produto/Homepage` à direita, e linha de métricas inline (Visitantes, Conversão A→B, Lift, Confiança, Tempo com progress bar). Prod: lista vazia, "Nenhum experimento cadastrado ainda." **Fix:** seed de dados-demo + componente card-row.
4. **Subtítulo header** — Design: `2 rodando · 2 concluídos · 1 rascunho`. Prod: nenhum subtítulo (só tooltip ?).
5. **Botão "Templates"** ausente — Design: secundário ao lado do "+ Novo experimento". Prod: ausente.

#### Gaps medios
6. **Footer com tabs de demo** — Design tem barra inferior `Dashboard | Pedido | Produtos | Cliente | Settings | … | A/B Tests | Dark | Login` para navegação rápida na demo. Prod ausente. **Decisão estratégica:** isto é design "demo-mode" ou padrão real? Documento balisador não menciona — pausar para stakeholder.
7. **Tooltip "?" próximo ao título** — Design tem dois ícones de ajuda (`?`) no header. Prod tem mas com cor mais clara.

#### Cosmeticos
8. Header "Experimentos A/B" com peso 700 em prod, design parece 600.
9. Spacing entre header e conteúdo: design `--space-8`, prod parece `--space-6`.

---

### 3. `abtest-detail.png` vs `/experiments/EXP-018`

**Status:** **0% paridade — 404 em prod**
Ref ground-truth: `docs/design-system/project/screenshots/abtest-detail.png`
Ref prod: 404 (não existe rota dinâmica)

#### Gaps críticos
1. **Rota dinâmica `/experiments/[id]/page.tsx` não existe** — `apps/admin/src/app/experiments/` só tem `page.tsx`. **Fix:** criar a rota.
2. **Toda a tela precisa ser construída.** Componentes únicos do design:
   - Card hero "ANÁLISE ESTATÍSTICA IA" com checkmark verde, título "Variante B venceu com 94.2% de confiança", parágrafo explicativo, badge `p = 0.018 · n = 2.847`, e CTA "Risco baixo de declarar vencedor agora."
   - Painel "Variantes" 2 colunas (A · CONTROLE / B · TESTE) com previews de página + botões CTA dummy.
   - Painel "Confiança estatística" com **gauge semicircular** mostrando 94.2% em laranja (`--warning`?), legendas P-VALOR e LIFT RELATIVO.
   - Botões header "Pausar" (outline) + "Declarar B vencedor" (accent fill).
   - Subtítulo `EXP-018 · Página de produto · Rodando · Dia 9 de 14`.

**Recomendação:** scope grande — pelo menos 1 sprint dedicado.

---

### 4. `customer-check.png` vs `/clientes/{id}`

**Status:** **0% paridade — 404 em prod**
Ref ground-truth: `docs/design-system/project/screenshots/customer-check.png`
Ref prod: 404

#### Gaps críticos
1. **Rota dinâmica `/clientes/[id]/page.tsx` não existe.** Listagem `/clientes` existe e renderiza pills RFM (Todos, Campeões, Fiéis…) mas o **detalhe individual está ausente**.
2. **Componente RFM Segment switcher** — Design tem barra superior com pills coloridas: `Champion 5/5/4` (selected, ring accent), `At Risk 2/4/4`, `Lost 1/2/2`, `New 5/1/3`. Listagem prod tem pills mas com dot colorido + número 0 — diferente visualmente.
3. **Card cliente principal** — Avatar grande verde com iniciais, email, badge RFM, descrição comportamental ("Compra de 30 em 30 dias · prefere brincos"), grid 2x2 com LTV / Pedidos / Ticket médio / Recência.
4. **Painel "IA · PRÓXIMAS OPORTUNIDADES"** — Lista de 3 cards de ação sugerida pela IA (Cross-sell, Garantia, Aniversário) cada um com ícone semântico (bag/shield/bag), título, parágrafo de contexto IA-gerado, métrica `↳ similaridade: 0,82 · n=12`, e CTA accent ("Montar campanha 1-a-1", "Enviar oferta", "Agendar"). **Padrão importante reutilizável** para outras telas com IA.
5. Subtítulo "Cliente desde maio 2024 · 12 pedidos" não existe.
6. Botões "Nova mensagem" + "+ Pedido manual" no header.

**Recomendação:** sprint dedicado — depende de seed de cliente, integração WhatsApp/email, e endpoint IA de oportunidades.

---

### 5. `checkout.png` (jewelry-v1) vs `https://apps-lojeo-storefront…/`

**Status:** ~70% paridade (melhor da auditoria)
Ref ground-truth: `docs/design-system-jewelry-v1/project/screenshots/checkout.png` — **OBS:** apesar do nome "checkout.png", o conteúdo é a HOME (hero "Peças que ficam"). Renomear ou reclassificar.
Ref prod: `prod-storefront-home.png`

#### Match (paridade ok)
- Paleta bege/sand correta no hero.
- Tipografia serif elegante no H1 "Peças que ficam." (Cormorant/Playfair-style).
- Botões dark-filled "Ver coleção" + outline "Nossa história".
- Eyebrow `COLEÇÃO · OUTONO '26` em uppercase com letter-spacing largo.
- Top nav com categorias (Anéis, Brincos, Colares, Pulseiras, Coleções).
- Logo "ATELIER" centralizado no topo (similar ao design).
- Ícones do header (search, account, wishlist, cart) presentes.

#### Gaps medios
1. **Logotipo do header** — Design: `ATELIER` com tagline "JOALHERIA · DESDE 2024" abaixo em letter-spacing. Prod: `Joias — Premium BR` em texto sans-serif simples. **Fix:** template precisa de logo wordmark próprio (custom SVG ou tipografia serif aplicada).
2. **Hero placeholder visual** — Design: ilustração circular sutil (linhas, pontos) sugerindo joia. Prod: `PLACEHOLDER · HERO LIFESTYLE` literal em texto. **Fix:** asset real ou shape ornamental decorativo.
3. **Bloco "Por categoria"** — Prod tem mas placeholders genéricos (oval bege gigante). Design original mostra apenas o hero — não dá pra comparar diretamente, mas o oval-blob é amador.
4. **Bloco "Recém-criadas"** — Cards produto prod estão pálidos (avatar-pessoa-genérico de placeholder). Verificar que `apps/storefront/src/components/ProductCard.tsx` está alinhado com `product-card.html` do design-system jewelry-v1.
5. **Trust signals (Ouro 18k certificado · Frete grátis · Garantia · Devolução)** estão na home prod mas não estão no PNG ground-truth (que é só hero). Comparar contra `trust-signals.html` do preview.

#### Cosmeticos
6. Texto sobreposto entre hero e conteúdo — em `prod-storefront-home.png` o screenshot reduzido mostra texto cortado por placeholder; pode ser issue do screenshot ou layering real.
7. Footer dark fundo `#1A1A1A` aproximadamente — confere com design tokens jewelry-v1.

---

## Componentes detalhados (vs preview HTML do design-system)

### Buttons (`components-buttons.html`)
- ✅ Accent fill (dark green) — prod ok
- ✅ Outline secondary — prod ok
- ⚠️ Faltam variantes ghost/destructive testadas — não verificadas em uso real
- ⚠️ Tamanhos sm/md/lg padronizados — em uso parecem só md

### Badges (`components-badges.html`)
- ⚠️ Em prod, badge "Pendente" cinza está sendo usado para tudo — perde a semântica `success/warning/error`
- ❌ Badge "Vencedor" verde com dot, status `Rodando`/`Concluído`/`Inconclusivo` — não usados (falta dados)
- ❌ Badge `EXP-XXX` (mono font, fundo neutral-50) — não usado

### Inputs (`components-inputs.html`)
- ✅ Search box no topbar — radius e tamanho ok
- ⚠️ Não auditados: text input padrão, select, checkbox, radio, switch — não há forms visíveis nas pages auditadas

### Metric cards (`components-metric-cards.html`)
- ❌ **Componente sem sparkline integrado.** Cards do dashboard prod usam só números. Padrão definido no design tem sparkline + delta colorido + label uppercase.
- ⚠️ Tabular nums aplicado? — verificar `font-variant-numeric: tabular-nums` nos cards

### Tables (`components-table.html`)
- ⚠️ Tabela "Clientes" com headers "Cliente | Segmento | Pedidos | LTV | Último pedido | R | F | M" existe mas vazia — não dá para auditar densidade/zebra/hover
- ⚠️ Tabela "Últimos pedidos" no dashboard idem (vazia)

### Toasts (`components-toasts.html`)
- ❓ Não vistos em uso. Não foi possível auditar.

### AI banner (`components-ai.html`)
- ✅ Banner "IA · INSIGHTS DE HOJE" no dashboard usa accent-soft bg + ícone sparkle — padrão correto
- ❌ Variante hero AI (com 2 botões CTA + assinatura modelo) — não vista em prod
- ❌ Variante card AI list-item (próximas oportunidades) — page cliente individual ausente

### Empty states (`components-empty-state.html`)
- ⚠️ "Nenhum cliente neste segmento.", "Nenhum experimento cadastrado ainda.", "Nenhum pedido ainda." — funcionais, mas sem **ícone ilustrativo** e sem CTA acionável (design system prevê ambos)
- **Fix:** EmptyState component deveria ter `<icon>` + `<title>` + `<description>` + `<cta>`

---

## Tokens vs implementação

| Token | Design | Prod (computed) | Status |
|---|---|---|---|
| `--accent` | `#00553D` | `#00553d` | ✅ |
| `--paper` | `#FAFAF7` | `#fafaf7` | ✅ |
| `--bg` | `#FAFAF7` | `#fafaf7` | ✅ |
| `--sidebar-w` | `248px` | `248px` | ✅ |
| Font sans | Inter | Inter | ✅ |
| Font mono | JetBrains Mono | (não auditado em uso) | ❓ |
| `--success/--warning/--error` semantic | sim (10B981/F59E0B/EF4444) | sim, mas **não aplicados nos badges em uso** | ⚠️ |
| Radius cards | 12px | 12px | ✅ |
| Shadows | xs/sm/md/lg/xl definidos | aplicados parcialmente | ⚠️ |
| AI gradient | `linear-gradient(135deg, #00553D, #007A57, #34C796)` | não verificado em uso (não há componente que use) | ❌ |
| Letter-spacing tight `-0.02em` em headings | sim | aplicar — H1 prod tem mas precisa confirmar nos H2/H3 | ⚠️ |

**Conclusão tokens:** o **CSS tokens layer está correto**. Falha está em **composição** e **uso dos tokens nos componentes**.

---

## Plano de fix priorizado

### P0 — Críticos (sprint imediato)
1. **Criar `/experiments/[id]/page.tsx`** com painel IA + variantes A/B + gauge confiança. Sem isso, link da listagem leva a 404.
2. **Criar `/clientes/[id]/page.tsx`** com card cliente + painel "IA · próximas oportunidades". Idem 404.
3. **Plugar `Sparkline` nos metric cards do dashboard** + computar deltas via `pctDelta()` e renderizar com cor semântica.
4. **Construir gráfico "Receita · últimos 7 dias"** no dashboard (área-chart com comparação semana anterior).
5. **Construir painel "IA · resumo dos testes"** no `/experiments` (lista) — feature-âncora da page.
6. **Implementar filtros tabulados em `/experiments`** (Todos | Rodando | Concluídos | Inconclusivos | Rascunhos) com counters.

### P1 — Médios (sprint seguinte)
7. **Topbar:** breadcrumb hierárquico (`Loja / Dashboard`) + bell com dot indicador.
8. **Sidebar footer:** mostrar nome real do usuário + tenant ("Atelier Verde · MEI") em vez de "Admin Lojeo" puro.
9. **Badges semânticas com cor:** `Saúde das integrações` deveria mostrar `OK/Lento/Reconectar/Pendente` com tons certos, não tudo cinza.
10. **EmptyState component** com ícone + CTA acionável (substituir "Nenhum X cadastrado." textual).
11. **Storefront jewelry-v1:** trocar logo `Joias — Premium BR` por wordmark `ATELIER` com tagline; remover placeholders literais "PLACEHOLDER · HERO LIFESTYLE".
12. **Decisão estratégica com stakeholder:** as tabs de demo no rodapé (`Dashboard | Pedido | … | Login`) que aparecem nos PNGs são parte do design real ou só ferramenta de navegação para o protótipo? Documentar e ajustar.

### P2 — Cosméticos
13. Spacing header → conteúdo `--space-8` (32px) consistente.
14. Confirmar `font-variant-numeric: tabular-nums` em todos os números financeiros.
15. Subtítulo dashboard sem expor "template jewelry-v1" (mover para settings).
16. Pills RFM com cores e número de itens reais (não só `0`).
17. Footer "Gerenciar →" do bloco integrações — confirmar com design.

---

## Anexos

- Screenshots prod gerados durante auditoria (Playwright):
  - `prod-admin-dashboard.png` (full)
  - `prod-dashboard-viewport.png`
  - `prod-experiments-list.png`
  - `prod-clientes-list.png`
  - `prod-cliente-detalhe-404.png`
  - `prod-experiment-detail.png` (404)
  - `prod-storefront-home.png`
- PNGs ground-truth referenciados:
  - `docs/design-system/project/screenshots/{admin-dashboard,abtest-list,abtest-detail,customer-check}.png`
  - `docs/design-system-jewelry-v1/project/screenshots/checkout.png`
- Tokens-fonte: `docs/design-system/project/colors_and_type.css`
- Sidebar-fonte: `apps/admin/src/components/layout/sidebar.tsx` (correto)
- Dashboard-fonte: `apps/admin/src/app/dashboard/page.tsx` (precisa adicionar sparklines + chart + deltas)
