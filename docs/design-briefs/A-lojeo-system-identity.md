# Briefing Claude Design — A) Identidade Lojeo (sistema/produto SaaS)

> **Camada:** Lojeo (sistema/admin/marca corporativa do produto SaaS). NÃO é template de loja.
> **Bloqueia:** Sprint 0 (logo + login admin) parcialmente, Sprint 5 (admin operacional completo) totalmente.
> **Output esperado:** design system completo em Tailwind tokens + especificações de componentes + Figma + handoff bundle pra Claude Code.

---

## Contexto do produto

**Lojeo** é um motor de e-commerce SaaS multi-tenant brasileiro voltado para MEI/PME. Diferencial central: IA nativa profunda (geração de copy, imagem, vídeo, insights, chatbot, busca semântica) — nenhum concorrente nacional oferece. Concorrentes diretos: Shopify (caro, em dólar), Nuvemshop, Tray, Loja Integrada (todos sem IA real).

Fase 1: duas lojas-laboratório próprias (joias BR + café internacional). Fase 2: SaaS aberto multi-tenant.

Esta identidade é da **marca corporativa Lojeo** — usada no admin (todos os lojistas verão), no marketing site futuro, em materiais institucionais. NÃO confundir com identidade dos templates (jewelry-v1, coffee-v1) que são identidades de nichos específicos aplicadas em storefronts de lojas-cliente.

## Posicionamento

**"Apple do e-commerce brasileiro para MEI/PME."**

- Premium acessível — qualidade visual de Linear/Vercel + calor brasileiro
- Não é "Shopify barato" nem "Vtex enterprise"
- Promessa: "loja profissional sem você ser técnico"
- Personalidade: confiável + moderno + caloroso (não frio como SaaS gringo)
- Público-alvo: MEI/PME brasileiro, lojista médio sem time técnico

## Marca

### Wordmark

- **Nome:** `lojeo` — sempre em **minúsculas** (humilde, acessível, moderno)
- Origem semântica: "loja" + "eu" → "minha loja"
- Tipografia do wordmark: geometric sans, peso médio, levemente arredondada (não rígida)
- Inspiração: wordmarks Vercel, Linear, Stripe, Notion (minimalistas, memoráveis)

### Símbolo

- Pictograma geométrico minimalista, 1 elemento simples
- Ideias para explorar: bolinha/ponto orgânico no "j" ou "o", ou símbolo independente que evoque "loja" sem ser literal (não usar carrinho de compras, sacola, etiqueta — clichês)
- Inspiração: Vercel ▲, Linear ◢, Stripe ≋ — geométricos, abstratos, memoráveis
- Versões: full lockup (símbolo + wordmark), wordmark-only, símbolo-only (favicon, app icon)

### Paleta corporativa Lojeo

**Filosofia:** monocromática + 1 cor de destaque (Apple-style).

```
Base neutros:
- Off-white quente (paper):    #FAFAF7
- Surface puro (cards/modais): #FFFFFF
- Cinzas escalados:
  - #F5F5F5 (bg sutil)
  - #E5E5E5 (divider claro)
  - #D4D4D4 (border)
  - #A3A3A3 (text muted)
  - #737373 (text secondary)
  - #404040 (text tertiary on dark)
  - #262626 (text primary alternativo)
  - #171717 (surface dark)
  - #0A0A0A (preto suave — text primary)

Accent (cor da marca Lojeo):
- Verde profundo brasileiro: #00553D (primary)
- Hover: #007A57
- Dark variant: #00302A

Semânticas (sistema):
- Success: #10B981
- Warning: #F59E0B
- Error:   #EF4444
- Info:    #3B82F6
```

**Justificativa do verde:**
- Mercado brasileiro tem afinidade com verde (Banco do Brasil, Sicredi, Mercado Livre amarelo-azul mas verde como aspiração financeira)
- Diferencia de "azul SaaS" gringo (Stripe, Shopify, Vercel)
- Conota dinheiro, sucesso, crescimento, mata atlântica
- Combina com posicionamento premium (Cartier verde, Rolex green)

Dark mode: inverter base mantendo accent. Background `#0A0A0A`, surface `#171717`, accent ajustado para legibilidade.

### Tipografia

- **Display + Body:** **Inter** (variable font, multi-weight 100-900, suporte português perfeito, free, padrão moderno)
- **Code/Data:** **JetBrains Mono** (tabelas de dados, valores monetários, IDs, JSON no admin)

Escala tipográfica (rem-based):
- Display 2XL: 4.5rem / 1
- Display XL:  3.75rem / 1
- Display L:   3rem / 1.1
- H1: 2.25rem / 1.2
- H2: 1.875rem / 1.25
- H3: 1.5rem / 1.3
- H4: 1.25rem / 1.4
- Body L: 1.125rem / 1.6
- Body:   1rem / 1.5
- Body S: 0.875rem / 1.5
- Caption: 0.75rem / 1.4

Pesos usados: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Evitar 900.

### Tom de voz

- Português brasileiro real (nunca traduzido do inglês)
- "Você" formal-amigável (não "tu", não "vós")
- Ativo, direto, esperançoso
- Microcopy:
  - Sucesso: "Tudo certo!", "Vendido!", "Pronto, está no ar."
  - Erro: "Não rolou — vamos tentar de novo?", "Hmm, deu ruim por aqui. Tenta isto:"
  - Vazio: "Ainda nada por aqui — comece criando seu primeiro produto."
  - Loading: "Um instante…" (nunca "Loading…")
- Não infantilizar ("queridinha", "fofa") nem usar gírias datadas
- Não usar "vendinha" ou diminutivos depreciativos
- Inspirações de tom: Stripe (técnico-claro) + iFood (amigável-direto)

## Design system do admin Lojeo

### Tema e densidade

- **Tema:** Light mode default. Dark mode disponível via toggle (no menu do usuário, persiste por user)
- **Densidade:** Espaçoso (Stripe-style). Modo "compacto" disponível em listas/tabelas para power users.
- **Justificativa:** lojista MEI/PME maioria não-tech. Light + espaçoso reduz erros e fricção.

### Princípios de UX

1. **Fator moleza** — toda tela tem instruções contextuais. Lojista nunca precisa buscar ajuda externa pra usar pela primeira vez.
2. **Estados vazios bem desenhados** — quando lojista entra na primeira vez (sem produtos, sem pedidos, sem clientes), telas explicam o que fazer e dão call-to-action claro.
3. **Errors são amigáveis** — nunca jargão técnico. Sempre próxima ação clara.
4. **Microcopy abundante** — labels, hints, tooltips em português natural BR.
5. **Confirmações pra ações destrutivas** — modais com cor warning/error e copy explícita.

### Componentes-base necessários

- **Navegação:** sidebar lateral colapsável + topbar com search universal + menu usuário + notificações
- **Botões:** primary (accent verde), secondary (outline neutral), ghost, destructive (red), icon-only, loading state
- **Inputs:** text, textarea, select, multi-select, combobox, date picker, color picker, file upload (drag & drop), rich text editor, toggle, checkbox, radio, slider
- **Display:** cards, badges (status, contagem), tags, avatares, progress bars, skeletons (loading), empty states
- **Tables:** denso vs espaçoso, sortable, filterable, batch actions, paginação, bulk edit, row actions menu
- **Modais e drawers:** confirmação, formulário lateral, side panel
- **Feedback:** toasts (success/warning/error/info), inline alerts, banners, tooltips
- **Layout:** containers, grids, dividers, sections com header
- **Charts:** line, bar, donut, sparkline, funnel (para dashboard)
- **Patterns específicos:**
  - "Connected via OAuth" status pill (verde quando conectado)
  - "Health" indicator (verde/amarelo/vermelho com tooltip)
  - "AI badge" sutil (indica feature de IA — gradiente discreto, não chamativo)

### Layouts a entregar

1. **Login admin** — minimalista, logo Lojeo central, "Entrar com Google" (OAuth 1-clique), opção Apple ID e email/senha como fallback
2. **Onboarding pós-login (primeira vez)** — wizard de 3-5 steps: nome da loja, template, logo, gateways de pagamento (decisão de adiar wizard com IA pra Fase 2 SaaS — versão Fase 1 é manual mas guiado)
3. **Dashboard principal** — métricas (receita, pedidos, conversão, margem), gráficos, alertas pendentes, próximas ações
4. **Lista de produtos** — table denso com bulk actions, filtros laterais, search
5. **Detalhe de produto** — formulário com variantes, galeria, SEO, fiscal, garantia, custom fields do template
6. **Lista de pedidos** — table com status timeline visual
7. **Detalhe de pedido** — timeline de status, dados cliente, produtos, pagamento, frete, NF-e, ações (separar/enviar/reembolsar/abrir troca)
8. **Fila de moderação de avaliações** — preview rápido + aprovar/rejeitar 1 clique
9. **Fila de trocas/devoluções** — lista + detalhe com fluxo de aprovação
10. **Página de cliente (CRM)** — perfil + histórico + LTV + RFM + garantias + tickets
11. **Configurações** — tabs: identidade, gateways (com OAuth 1-clique), frete, email, equipe, IA
12. **Equipe e permissões** — lista de usuários + convite + roles (Owner, Admin, Operador, Editor, Atendimento, Financeiro) + 2FA
13. **Wishlist + gift card + back-in-stock** — listas no admin + configuração
14. **A/B testing editor** — criar experimento, definir variantes, audiência, métricas
15. **Relatórios programados** — criar agendamento, filtros, destinatários, frequência
16. **Status de saúde das integrações** — verde/amarelo/vermelho por gateway/integração + botão "Ressincronizar"

### Estados a cobrir (cada layout)

- Loading (skeleton)
- Empty (primeira vez)
- Erro (servidor caiu, sem permissão, dados inválidos)
- Sucesso (após ação)
- Hover, focus, disabled, active

### Acessibilidade

- WCAG 2.1 AA mínimo
- Contraste mínimo 4.5:1 para texto normal
- Foco visível em todos elementos interativos (ring com cor accent)
- Navegação completa por teclado
- ARIA labels apropriados

## Formato de entrega esperado

1. **Design tokens em JSON** (compatível com Tailwind v4 — variáveis CSS)
2. **Componentes em Figma** com auto-layout e variants
3. **Specs por layout** (espaçamentos, comportamentos, breakpoints — mobile-first responsive)
4. **Handoff bundle Claude Code** — package que Claude Code possa importar diretamente em `packages/ui/`
5. **Mood board / referências visuais** — para validar direção antes de finalizar

## Referências (mood board)

- **Linear** — densidade, dark mode elegante, microinterações
- **Vercel dashboard** — clareza, hierarquia, monocromático com accent
- **Stripe dashboard** — espaçamento, tabelas de dados, formulários longos
- **Apple System Settings (macOS)** — clareza extrema, microcopy, confiança
- **Notion** — vazios bem desenhados, onboarding progressivo

NÃO usar como referência: Shopify (muito "loja"), Wix (muito visual/bagunçado), Bling/Olist (legacy BR sem refinamento).

## Restrições

- Sem ilustrações cartoon/3D
- Sem ícones coloridos (usar Lucide ou Heroicons monocromáticos)
- Sem gradientes pesados (gradiente sutil OK em AI badge ou hero do marketing)
- Sem fotografia de stock no admin (admin é puro UI)
- Sem dark patterns (urgência falsa, opt-in confuso)

## Pergunta antecipada que Claude Design pode fazer

Se Claude Design perguntar sobre:
- **Variantes do logo:** sim, gerar light bg + dark bg + monocromático preto + monocromático branco
- **Marca registrada/legal:** verificar disponibilidade do nome "lojeo" não é responsabilidade do designer (já decidido pelo PO)
- **Outros idiomas:** Fase 1 só PT-BR, mas tipografia (Inter) suporta tudo. Não precisa criar variantes EN agora.
- **Mascote/personagem:** NÃO. Marca é abstrata e profissional, sem personagem.
- **Animação do logo:** desejável — versão animada sutil pra splash screen e marketing futuro
