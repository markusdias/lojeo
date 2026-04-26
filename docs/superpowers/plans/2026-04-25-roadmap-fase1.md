# Lojeo — Plano de Desenvolvimento Fase 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor único de e-commerce com template de joias em produção vendendo de verdade, validando o mercado BR — com diferenciais de IA nativa, UGC e personalização comportamental que nenhum concorrente nacional oferece.

**Architecture:** Monorepo Next.js 15 (App Router) com packages compartilhados para engine, DB (Drizzle + Neon) e UI. Motor não conhece nicho — carrega template via configuração de instância. Multi-tenant por `tenant_id` desde o dia 1. Coleta de comportamento e tracking são fundação, não feature posterior.

**Tech Stack:** Next.js 15, TypeScript, pnpm workspaces + Turborepo, Neon (PostgreSQL com pgvector), Drizzle ORM, Auth.js v5, Trigger.dev (self-hosted), Cloudflare R2, Resend, shadcn/ui + Tailwind v4, Vitest + Playwright. Anthropic Claude API (Haiku para alto volume, Sonnet para premium).

**Regra de ouro:** O motor (`packages/engine`) não pode importar nada de `templates/`. Templates são carregados via configuração de instância.

**Princípio de IA:** Toda feature de IA tem cache + modo degradado + tracking de custo. Sem exceção.

**Princípio de integrações:** Toda integração externa segue o padrão **OAuth 1-clique** sempre que o provedor oferecer. API key manual é fallback, nunca caminho principal. Lojista nunca copia chave manualmente quando OAuth for possível. Aplica a: Stripe, Mercado Pago, Pagar.me, PayPal, Melhor Envio, FaqZap, GA, GTM, Meta Pixel, TikTok Pixel, Google Ads, Microsoft Clarity, Bling, Olist, Resend, marketplaces (Mercado Livre, Shopee, Amazon, Etsy, Google Shopping, Meta Catalog).

**Distinção fundamental — Lojeo (sistema) vs Templates (instâncias):**

| Camada | Identidade visual | Onde aparece |
|---|---|---|
| **Lojeo (sistema + admin + marca SaaS)** | Identidade corporativa Lojeo, neutra e multi-nicho | Admin completo, marca-mãe, dashboards, fila moderação, IA Analyst, Estúdio criativo, Painel uso IA |
| **Template `jewelry-v1`** | Mood de joalheria premium BR | Storefront da loja de joias: homepage, PLP, PDP, checkout, conta cliente, widget chatbot, galeria UGC, hero personalizado |
| **Template `coffee-v1`** (Fase 1.2) | Mood de café artesanal internacional | Storefront da loja de café |

**Regra:** todo briefing de design declara explicitamente qual camada. Storefront ≠ Admin. Marca Lojeo ≠ Marca jewelry-v1 ≠ Marca coffee-v1.

**Princípio de IA — Research-first protocol (OBRIGATÓRIO):** Antes de implementar QUALQUER feature de IA, executar fase de pesquisa documentada em `docs/research/<sprint>-<feature>.md`. Inclui:
- Para geração de imagem/vídeo: pesquisar prompts de referência por modelo (DALL-E 3, Flux, Ideogram, Stable Diffusion 3, Midjourney, Veo, Runway, Pika), padrões de sucesso para e-commerce/produtos, estratégias de seed/variation/upscale, custos por tentativa, melhores práticas de cada provider
- Para outras IAs (chatbot, analyst, recomendação, moderação): pesquisar implementações reais em GitHub (open source de ponta), papers/artigos relevantes, soluções de concorrentes (Shopify Magic, Shopify Sidekick, Klaviyo AI, etc), patterns consolidados (RAG, tool-calling, hybrid search, RFM ML)
- Documentar fontes, sumarizar achados, registrar decisão arquitetural antes de codar
- Critério: nenhum prompt entra em produção sem ter passado por benchmark (mínimo 3 variações testadas com mesma input, comparação custo × qualidade)

---

## Mapa de sprints

| Sprint | Tema | Duração | Bloqueador externo |
|---|---|---|---|
| 0 | Fundação técnica | 2 semanas | **🎨 Design A (Lojeo — marca + admin login)** |
| 1 | Motor + catálogo + tracking foundation | 2 semanas | — |
| 2 | Storefront base + instrumentação behavioral | 3 semanas | **🎨 Design B (template jewelry-v1)** |
| 3 | Checkout + pagamentos BR | 2 semanas | Conta Mercado Pago |
| 4 | Pedidos + frete + fiscal | 2 semanas | Conta Bling + Melhor Envio |
| 5 | Admin + wishlist + gift card + back-in-stock | 3 semanas | **🎨 Design A completo (admin)** |
| 6 | CRM + garantias + trocas + segmentação RFM | 2 semanas | — |
| 7 | IA backoffice básica (descrições, SEO, fundo) | 2 semanas | Chave Claude API |
| 8 | IA Analyst + churn + previsão de estoque | 2 semanas | **🎨 Design C (IA UX no admin Lojeo)** |
| 9 | FaqZap + chatbot storefront + tickets | 2 semanas | Conta FaqZap + **🎨 Design D (chatbot widget no template)** |
| 10 | UGC + galeria + compre o look + moderação | 2 semanas | (Design C editor compre o look) |
| 11 | Estúdio criativo IA + motor de recomendação | 2 semanas | API imagem + (Design C estúdio) |
| 12 | Busca semântica + pixels + SEO + Clarity-IA + homepage personalizada | 2 semanas | (Design D homepage personalizada no template) |
| 13 | Polimento + segurança + produção | 2 semanas | — |

**Total estimado Fase 1 (joias):** ~30 semanas (~7,5 meses)

---

## Sprint 0 — Fundação técnica

**Objetivo:** Repositório rodando, banco conectado, deploy funcional no EasyPanel, CI/CD verde.

**Entregável tangível:** `https://joias.seudominio.com` mostrando página "em breve", admin acessível com login Google, pipeline de CI passando.

**Critérios de pronto:**
- [ ] Monorepo com pnpm workspaces + Turborepo buildando sem erros
- [ ] Schema inicial no Neon com `tenant_id` em todas as tabelas base
- [ ] Extensão `pgvector` habilitada no Neon (preparação para embeddings)
- [ ] Auth.js v5 com Google OAuth funcionando no admin
- [ ] Trigger.dev self-hosted rodando no EasyPanel
- [ ] Cloudflare R2 bucket configurado (storage abstrato no código)
- [ ] GitHub Actions: lint + typecheck + test em cada PR
- [ ] Deploy automático para EasyPanel em merge na main
- [ ] `DECISION_LOG.md` criado com as decisões da Etapa 2
- [ ] Estrutura de observabilidade: logs estruturados + dashboard básico de erros
- [ ] Diretório `docs/research/` criado para receber pesquisas obrigatórias antes de cada sprint de IA
- [ ] Template jewelry-v1 com 3 a 5 combinações tipográficas curadas (Sec 3.3 do doc balisador) — fonte serifada clássica, fonte display com contraste, monoespaço minimalista, etc. Lojista escolhe combinação inteira, não fontes soltas.

**Estrutura de pastas a criar:**

```
lojeo/
├── apps/
│   ├── storefront/          # Next.js — loja (1 deploy por instância)
│   └── admin/               # Next.js — painel administrativo
├── packages/
│   ├── engine/              # Motor: lógica de negócio pura
│   ├── db/                  # Schema Drizzle + migrations
│   ├── storage/             # Abstração R2/local
│   ├── email/               # Templates React Email
│   ├── tracking/            # SDK de coleta de comportamento (anônimo, LGPD)
│   ├── ai/                  # Wrapper Claude API com cache + cost tracking
│   └── ui/                  # Componentes shadcn compartilhados
├── templates/
│   ├── jewelry-v1/          # Design tokens, campos, tom de voz
│   └── coffee-v1/           # (vazio até Sprint 14)
├── docs/
│   ├── superpowers/plans/
│   └── adr/                 # Architecture Decision Records
├── DECISION_LOG.md
├── CLAUDE.md
└── turbo.json
```

**Pontos de atenção:**
- Google OAuth: criar app em console.cloud.google.com, domínio de desenvolvimento + produção já adicionados
- Apple OAuth: criar Apple Developer app (requer Apple Developer $99/ano) — **decisão do stakeholder:** incluir Apple login no sprint 0 ou postergar?
- Neon: criar projeto "lojeo-prod" + branch "dev" para desenvolvimento
- EasyPanel: configurar variáveis de ambiente por instância (joias vs café)
- pgvector é gratuito no Neon e elimina necessidade de Pinecone/Weaviate na Fase 1

---

## Sprint 1 — Motor + catálogo + tracking foundation

**Objetivo:** Lojista cadastra produtos. Sistema já coleta sinais de comportamento desde o início (mesmo sem storefront pronto, schema e contratos prontos).

**Entregável tangível:** Admin funcional onde é possível criar produtos com variantes e galeria. Tabela de eventos comportamentais existindo e recebendo eventos de teste.

**Critérios de pronto:**

**Catálogo:**
- [x] Entidades no banco: `tenant`, `product`, `product_variant`, `product_image`, `collection`, `inventory`
- [x] Upload de imagens → R2 com otimização automática (WebP, thumbnails) — local driver em dev, R2 via env em prod
- [x] CRUD completo de produtos via API (Next.js Route Handlers)
- [x] Campos obrigatórios: nome, descrição, preço, preço promocional, custo, SKU, status, URL amigável — todos no schema + API
- [x] Variantes com até 3 dimensões, estoque e preço por variante — optionValues jsonb + priceCents + stockQty
- [x] Coleções: criação manual + campo `rules` jsonb (automação implementada Sprint 2)
- [x] SEO por produto: seoTitle, seoDescription — editáveis via PUT
- [x] Campos customizados por template (joias: material, pedra, quilate, tamanho, aro) — customFields jsonb
- [x] Garantia e política de troca configuráveis por produto — warrantyMonths
- [x] NCM e regime tributário por produto — campos ncm + taxRegime no schema + API
- [x] Restrições de exportação por país por produto — exportRestrictions jsonb no schema + API (enforcement no checkout Sprint 3)
- [x] Pré-venda com data prevista de envio — presaleShipDate no schema + API (exibição no storefront Sprint 2)
- [x] Alt text de imagens gerado por IA no upload — @lojeo/ai mock em dev, real em prod com ANTHROPIC_API_KEY
- [ ] ~~**Otimização automática de vídeos no upload (Sec 16)**~~ — **ADIADO: Trigger.dev image não pública ainda; entra Sprint 3 com deploy Trigger.dev completo**
- [x] Importação básica via CSV — dry-run + relatório por linha
- [x] Testes unitários: motor de catálogo (Vitest) — 56 testes, 11 pacotes

**Tracking foundation (NOVO — fundação obrigatória):**
- [x] Schema `behavior_events` (tenant_id, session_id, anonymous_id, event_type, entity_id, metadata jsonb, created_at)
- [x] Schema `sessions` (anonymous_id, fingerprint, first_seen, last_seen, user_id nullable)
- [x] Package `@lojeo/tracking` com SDK client + endpoint de ingestão `/api/track`
- [x] Tipos de evento mapeados: `product_view`, `product_scroll`, `gallery_open`, `video_watched`, `variant_selected`, `cart_add`, `cart_remove`, `checkout_step`, `search_performed`, `search_clicked`
- [x] Fingerprint anônimo compatível com LGPD (sem PII) — SHA-256 + salt configurável
- [x] Buffer client + flush em batch (não bloqueia render) — flushIntervalMs=5000, maxBuffer=20
- [ ] ~~Trigger.dev: job de agregação noturna~~ — **ADIADO: mesmo motivo do vídeo; schema + contratos prontos, job entra Sprint 3**

**Schema Drizzle — exemplo:**

```typescript
// packages/db/src/schema/behavior.ts
export const behaviorEvents = pgTable('behavior_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  sessionId: uuid('session_id').notNull(),
  anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantTimeIdx: index('idx_events_tenant_time').on(t.tenantId, t.createdAt),
  sessionIdx: index('idx_events_session').on(t.sessionId),
}));
```

**Complexidade:** Média-Alta. Tracking foundation adiciona complexidade mas é não-negociável.

**Justificativa arquitetural:** Recomendações, personalização, IA Analyst, Clarity+IA — tudo depende de behavior_events existir desde o dia 1. Adicionar depois força backfill artificial (impossível) ou perda de meses de dados.

---

## Sprint 2 — Storefront base + instrumentação behavioral

> ⚠️ **BLOQUEADOR: Design Checkpoint B — template jewelry-v1 (storefront)**
>
> Este sprint **não pode começar** sem o design do template de joias aprovado.
> Atenção: identidade visual aqui é do **TEMPLATE jewelry-v1** (joalheria premium BR), não do Lojeo. Storefront ≠ Admin.

**Objetivo:** Cliente navega na loja, vê produtos, adiciona ao carrinho. Cada interação significativa é capturada pelo tracking.

**Entregável tangível:** Storefront com homepage, PLP, PDP e carrinho funcionando com design jewelry-v1, todos os eventos de comportamento sendo gravados.

**Critérios de pronto:**

**Storefront:**
- [x] Homepage com hero, coleções em destaque, seções configuráveis
- [x] PLP com filtros, ordenação, paginação
- [x] PDP com galeria de imagens/vídeos, variantes, campos do nicho
- [x] **Urgência com dados reais (Sec 6.3 / 21)** — "X pessoas vendo agora" (behavior_events COUNT last 5min) + "apenas Z em estoque" (inventoryStock SUM ≤ threshold). Nunca números falsos.
- [x] Carrinho com edição, barra frete grátis e resumo
- [x] Login social (Google) para clientes — implementado Sprint 6A (Auth.js split config + /entrar)
- [x] Área do cliente: histórico de pedidos, endereços — implementado Sprint 6A (/conta/pedidos + /conta/enderecos)
- [x] Busca simples por texto (/busca com ilike)
- [x] SEO técnico: sitemap.xml automático, robots.txt, Schema.org/produto JSON-LD
- [ ] Core Web Vitals — verificação em prod após Sprint 2 deploy
- [x] Template jewelry-v1 integrado: tokens CSS (5 typo combos, 5 accents, 4 BG tones), data-* attrs no <html>
- [x] Páginas estáticas (Sobre, Política, Trocas, Privacidade) — conteúdo placeholder; editor rich text Sprint 5
- [x] Produtos vistos recentemente — `useTrackRecentlyViewed` hook + `<RecentlyViewed>` localStorage 8 items, injetado na PDP entre UgcGallery e ReviewSection
- [x] Página de rastreamento branded — `/rastreio/[code]` server component com timeline visual de 5 steps (pending→paid→preparing→shipped→delivered), nome+email mascarados, botão Correios link quando shipped, fallback NotFound com form. Form `/rastreio` para input do orderNumber. Footer link "Rastrear pedido" aponta `/rastreio`. Tokens jewelry-v1
- [ ] **CEP autocomplete (BR)** — Sprint 3 checkout
- [ ] **Endereçamento adaptativo (Sec 4.1)** — Sprint 3

**Instrumentação behavioral:**
- [x] SDK `@lojeo/tracking` injetado em todas as páginas (TrackerProvider no layout)
- [x] Eventos: `product_view`, `product_scroll` (25/50/75/100%), `gallery_open`, `gallery_image_index`, `variant_selected`, `cart_add`, `cart_view`, `checkout_start`, `external_referrer`
- [x] `search_performed`, `search_clicked` — implementado Sprint 4 (SearchTracker + PLPFilters onClick)
- [ ] `video_watched_full` — Sprint 5 (requer player com eventos)
- [x] UTM preservado da landing até o pedido — TrackerProvider → sessionStorage → /api/orders
- [x] Banner de cookies LGPD com consentimento granular (essencial / analytics / marketing)
- [x] Tracking respeita consentimento (consent-aware no SDK desde Sprint 1)
- [ ] Identidade anônima → identificada quando cliente faz login — Sprint 5
- [x] Dashboard básico no admin: GET /api/events (eventos por dia + por tipo)

**Ponto crítico de arquitetura — como templates plugam:**

```typescript
// packages/engine/src/template-loader.ts
export async function loadTemplate(templateId: string) {
  const template = await import(`../../../templates/${templateId}/index.ts`);
  return template.default;
}

// apps/storefront/src/app/layout.tsx
const template = await loadTemplate(process.env.TEMPLATE_ID!);
```

**Duração:** 3 semanas (era 2). Justificativa: instrumentação behavioral em todas as superfícies é trabalhoso de fazer corretamente.

---

## Sprint 3 — Checkout + pagamentos BR

**Objetivo:** Cliente paga e recebe confirmação. Lojista vê o pedido.

**Entregável tangível:** Fluxo completo Pix → QR code → confirmação automática → email de pedido confirmado.

**Critérios de pronto:**
- [x] Checkout em mínimo de etapas (endereço → frete → pagamento → confirmação) — UI completa com stepper
- [x] Schema orders/order_items/order_events/customer_addresses + migration 0002
- [x] API POST /api/orders: cria pedido com snapshot de preço/endereço, audit event
- [x] CEP autocomplete via ViaCEP (gratuito, zero deps)
- [x] Pix com 5% desconto, boleto, cartão (método selecionável, sem tokenização real ainda)
- [x] Eventos de tracking checkout: step_start/step_complete em cada etapa
- [ ] **Conexão Mercado Pago via OAuth 1-clique** — BLOQUEADO: requer conta MP sandbox
- [ ] Mercado Pago: Pix QR code real, cartão tokenizado, boleto — BLOQUEADO: conta MP
- [x] Webhooks de pagamento com validação de assinatura (stub) — `/api/webhooks/{mercado-pago|bling|melhor-envio|resend}` com HMAC SHA-256 validation (manifest MP, Svix Resend), modo dev sem secret aceita. Processamento real (orders status, NF-e, tracking) v2 quando contas conectadas
- [ ] Sync gateway expandido via Trigger.dev — BLOQUEADO: conta MP + Trigger.dev
- [ ] Aviso VAT/taxas alfandegárias no checkout — Sprint 4
- [ ] Email transacional via Resend — BLOQUEADO: Resend API key
- [ ] Detecção básica de fraude — Sprint 4 (pós-MP)
- [x] Cupons de desconto no admin — schema `coupons` (code unique, type percent/fixed/free_shipping, min_order, max_uses, valid window), API CRUD admin + audit logs, API storefront `/api/coupons/validate`, UI `/cupons`. Integração checkout v2 pendente (lookup + apply + increment usesCount)
- [ ] Relatório de abandono por etapa — dados existem (behavior_events), UI Sprint 5
- [x] Testes E2E Playwright — `apps/storefront/tests/storefront-flow.spec.ts` cobre 9 specs: homepage hero+nav, PLP filtros, páginas estáticas (sobre/trocas/privacidade/termos), /rastreio form, auth gate /conta/*, PWA manifest+sw, SEO Product JSON-LD, /status. Setup playwright config existing (Sprint 13 axe-core)

**Bloqueadores externos:**
- Conta Mercado Pago com acesso à API (sandbox + produção)
- Configurar webhook URL no painel do Mercado Pago

**Complexidade:** Alta. Webhooks + retry + idempotência são críticos.

---

## Sprint 4 — Pedidos + frete + fiscal

**Objetivo:** Pedido pago vira NF-e automática e etiqueta de envio.

**Entregável tangível:** Pedido confirmado → NF-e emitida → etiqueta gerada → status "enviado" com código de rastreio.

**Critérios de pronto:**
- [x] Ciclo de vida completo: pending → paid → preparing → shipped → delivered → cancelled (state machine no admin PATCH /api/orders/:id + orderEvents audit)
- [ ] **Conexão Melhor Envio via OAuth 1-clique** — autoriza todas transportadoras da conta automaticamente
- [ ] **Conexão Bling via OAuth 1-clique** — sem copy-paste de chave
- [ ] Melhor Envio: cálculo de frete em tempo real, múltiplas opções com prazo
- [ ] Geração de etiqueta de envio com 1 clique (Correios, Jadlog via Melhor Envio)
- [ ] Integração Bling: NF-e automática ao confirmar pagamento (regra configurável: ao pagar OU ao despachar)
- [ ] NF-e disponível no email do cliente, área logada e admin (PDF + DANFE + XML)
- [ ] Pedido fica em "aguardando emissão fiscal" se NF-e falhar — alerta no admin
- [x] Fila de pedidos no admin com filtros e atualização de status (/pedidos + /pedidos/[id])
- [ ] Emails automáticos por transição de status — BLOQUEADO: Resend API key
- [x] Status de saúde do gateway/integração: verde/amarelo/vermelho — API `/api/integrations/status` checa presence de envs por serviço (Mercado Pago, Stripe, Bling, Melhor Envio, Resend, Anthropic, R2, FaqZap, Trigger.dev) com status `connected | partial | disconnected | optional`. UI `/integracoes` admin com cards por categoria + summary 4 cards + lista de envs presentes/faltantes
- [ ] Botão "Ressincronizar" para corrigir divergência loja × gateway com 1 clique

**Bloqueadores externos:**
- Conta Bling com acesso à API (CNPJ do lojista)
- Conta Melhor Envio

---

## Sprint 5 — Admin + wishlist + gift card + back-in-stock

**Objetivo:** Admin pronto para operação diária. Funcionalidades de retenção (wishlist, gift card, back-in-stock) funcionando porque são alavancas de receita de baixo custo de implementação.

**Entregável tangível:** Dashboard completo + filas operacionais + cliente pode adicionar à wishlist, comprar gift card, e pedir notificação de "voltou ao estoque".

**Critérios de pronto:**

**Admin operacional:**
- [x] Dashboard: métricas reais de pedidos (count+revenue 30d + pending alert) — expandir com produtos mais vendidos, visitantes, conversão na Sprint 5 completo
- [x] Fila de moderação de avaliações: preview, aprovar/rejeitar com 1 clique, resposta pública opcional
- [ ] Configurações completas via interface (identidade, gateways, frete, email)
- [x] Editor de aparência dentro dos limites do template — UI `/settings` aba Aparência expandida com 5 selects (typo a/b/c, accent champagne/silver/rose-gold/copper/noir-rose, bgTone warm/pure/cool/cream, imgRadius 0/8/16, typeScale smaller/default/larger) + visualizador inline; storefront layout aplica `data-*` attrs no `<html>` lendo `tenants.config.appearance`; reusa CSS existente `templates/jewelry-v1/tokens.css` (zero CSS novo)
- [x] Sistema de papéis (roles): Owner, Admin, Operador, Editor, Atendimento, Financeiro — schema `user_roles`, matriz `ROLE_PERMISSIONS` scope×permission, helpers `getCurrentRole()` + `requirePermission()`, API `/api/users` CRUD, UI `/settings/users` com convite + tabela
- [x] 2FA TOTP admin — schema `user_two_factor`, API `/api/2fa` setup/verify/disable, UI `/settings/2fa`, otplib window=1, audit log
- [x] **2FA enforcement no login flow** — middleware admin redireciona `/login/2fa-challenge?returnTo=X` quando user com 2FA habilitado sem cookie `lojeo_2fa_verified=1`. JWT cache via NextAuth callbacks (DB lookup só no signIn, embed no JWT, lido no edge runtime). Cookie httpOnly secure sameSite=strict 8h. Modes: TOTP 6-dígitos OU recovery code (consume hash do array)
- [x] Logs de auditoria: quem fez o quê e quando — schema `audit_logs` (action, entity, before/after), helper `recordAuditLog()`, integrado em order/ticket/ugc/role mutations, UI `/settings/audit` com filtros 7/30/90d e expand JSON
- [x] Convite de usuário por email com 1 clique — schema `user_invite_tokens` (token 32-byte hex, TTL 7d, acceptedAt), API `/api/users/invites` GET/DELETE + `/accept` POST, `/invite/[token]` page server lookup + accept form, auto-aceite via callback `signIn` quando email match. Envio email manual via copy-paste (sem Resend); UI `/settings/users` mostra inviteUrl pós-criação para lojista compartilhar
- [x] Instruções contextuais em todas as telas (fator moleza) — `<InfoTooltip text>` componente acessível (role=tooltip, aria-describedby, fecha em mouseleave/blur/Escape). 11 tooltips aplicados: 10 em `/settings` (freeShipping, pixDiscount, installments, warranty, typo, imgRadius, gtmId, gaTrackingId, aiMonthlyLimitCents, robotsTxt) + 1 em `/settings/users` (Papel)
- [x] **Robots.txt configurável** pelo admin (Sec 12.3) — campo `config.robotsTxt` em settings + rota `/robots.ts` lê do DB com fallback default
- [ ] **Relatórios programados por email** (Sec 13.2) — lojista define cron + filtros + destinatários, sistema dispara CSV/PDF
- [x] **A/B testing nativo integrado ao template** (Sec 12.2) — schema `experiments` (variants jsonb com weights), `experiment_assignments` (unique anon×experiment, deterministic), `experiment_events` (exposure/conversion); helper puro `selectVariant()` com hash FNV-1a (5 testes); API admin `/api/experiments` GET com stats agregados + POST/PATCH/DELETE; storefront `/api/experiments?keys=X&anonymousId=Y` retorna assignments determinísticos + persiste idempotente + emite exposure event; UI admin `/experiments` com cards, form criar inline, status workflow draft→active→paused/completed, tabela variantes com taxa conversão. Base pronta para Sprint 12 personalização de homepage.
- [x] **Feeds de catálogo automáticos** (Sec 6.2) — GET /api/feed/google (RSS XML) + GET /api/feed/meta (CSV), cache 1h/24h stale, pronto para colar no Google Merchant Center / Meta Commerce Manager.

**Wishlist (retenção):**
- [x] Schema: `wishlist_items` (user_id, product_id, variant_id, created_at) + migration 0003
- [x] Botão coração na PDP e card de produto (toggle) — HeartButton inline SVG
- [x] Página /wishlist com lista de salvos + add-to-cart
- [ ] Notificação automática quando produto da wishlist entra em promoção (Trigger.dev: job diário) — BLOQUEADO
- [x] Wishlist disponível para anônimos (localStorage) — migração para DB ao login na Sprint 5 completo
- [x] Recently viewed sync localStorage→DB ao login — schema `recently_viewed_items`, API `/api/recently-viewed` GET (distinct por productId via MAX viewed_at) + POST individual + POST bulk sync. Hooks `useTrackRecentlyViewed` + `useSyncRecentlyViewedOnLogin`

**Gift card / vale-presente digital:**
- [x] Schema: `gift_cards` (code, initial_value, current_balance, expires_at, status, buyer_id, recipient_email) + migration 0003
- [ ] Compra de gift card como produto especial no storefront
- [ ] Email automático para destinatário com código + design branded
- [ ] Aplicação no checkout como meio de pagamento (parcial ou total)
- [ ] Painel no admin: emitidos, resgatados, saldo total, expiração

**Back-in-stock:**
- [x] Botão "Avise-me quando voltar" em variante esgotada — RestockButton com email capture + POST /api/restock-notify
- [x] Schema: `restock_notifications` (user_id ou email, product_variant_id, notified_at) + migration 0003
- [ ] Trigger.dev: job que dispara quando inventário > 0 (email + WhatsApp via FaqZap quando Sprint 9 entregar)

**Opção de presente no checkout:**
- [ ] Toggle "É um presente" no checkout
- [ ] Campo de mensagem personalizada
- [ ] Embalagem para presente (com custo configurável pelo lojista)
- [ ] Pedido marcado para separação especial

**Duração:** 3 semanas (era 2). Justificativa: 4 features de retenção adicionadas, todas com schema + UI + integração.

**ROI esperado (visão CFO):** wishlist + back-in-stock + gift card sozinhos pagam o sprint extra em 60-90 dias de operação real. Custo de implementação baixo, custo de não-implementar é receita perdida silenciosa.

---

## Sprint 6 — CRM + garantias + trocas + segmentação RFM

**Objetivo:** Operação pós-venda estruturada. Zero WhatsApp manual para resolver troca. Clientes segmentados automaticamente para ações futuras.

**Entregável tangível:** Cliente abre troca pela área logada → lojista aprova/recusa no admin → etiqueta reversa gerada → reembolso disparado com 1 clique. RFM segmenta clientes em campeões, em risco, novos, inativos.

**Critérios de pronto:**
- [x] Perfil completo de cliente: dados, LTV, número de pedidos, segmento RFM, canal de aquisição, eventos comportamentais agregados
- [x] Garantias por produto/cliente: painel com status, alertas 30 dias antes do vencimento — engine puro `packages/engine/src/warranty.ts` (computeWarranty/Batch, expiringWithinDays, status active/expiring_soon/expired/none), 5 testes; API `/api/warranties?expiringIn=30/60/90` agrega orders+items+products.warrantyMonths; UI `/garantias` admin com cards + tabela filtrável
- [x] Filtro: clientes com garantia expirando nos próximos 30/60/90 dias — `?customerEmail=X` no endpoint + filtro de janela 30/60/90
- [x] Fluxo de trocas/devoluções v1 — schema `return_requests` (orderId, orderItemId nullable, type exchange/refund/store_credit, reason enum, status state machine), API admin `/api/returns` GET+filtros+PATCH com transition validation, API storefront `/api/returns` POST (validação warranty+order delivered+customer match), UI admin `/devolucoes` com cards expansíveis+botões workflow, UI storefront `/conta/devolucoes` lista+form. Logística reversa Bling/Melhor Envio = v2
- [x] Validação automática do prazo de troca configurado por produto — warranty expirada (deliveredAt+warrantyMonths*30d) → 422 warranty_expired no POST
- [x] Estados claros — `requested → analyzing | approved | rejected; analyzing → approved | rejected; approved → awaiting_product → received → finalized; rejected | finalized terminais`. State machine enforced via `canTransitionReturn()` (HTTP 422 se inválido)
- [ ] Geração de etiqueta reversa via Melhor Envio
- [ ] Reembolso integrado ao gateway no clique de aprovação
- [ ] Crédito em loja como alternativa ao reembolso (gift card automático — reusa Sprint 5)
- [ ] NF-e de devolução emitida automaticamente via Bling
- [x] **Segmentação RFM automática:** RFM engine em packages/engine com scoreCustomers() — quintis 1-5 por dimensão, 7 segmentos (Trigger.dev batch diário: Sprint 8)
- [x] Sugestão de recompra baseada em ciclo de consumo + garantia — `<RebuySuggestion>` no storefront `/conta/pedidos` + LTV/CLV no perfil cliente admin (`/clientes/[email]` 5 cards: total gasto, pedidos, ticket médio, LTV projetado, tempo ativo). Engine puro `customer-ltv.ts` (4 testes), filtra cancelados, expectedLifetimeMonths heurístico

---

## Sprint 7 — IA backoffice básica

**Objetivo:** Lojista gera descrições, SEO e remove fundos sem sair do admin.

**Entregável tangível:** Produto criado → botão "Gerar com IA" → descrição + meta title + meta description preenchidos automaticamente no tom de voz configurado.

**🔬 Research-first (OBRIGATÓRIO antes de codar prompts):**
- [x] `docs/research/sprint-7-product-copy-prompts.md` — pesquisar:
  - Prompts de e-commerce copy do Shopify Magic, Klaviyo, Jasper, Copy.ai
  - Repositórios open source: `shopify/llm-prompts`, `microsoft/prompt-engineering`
  - Best practices Anthropic para copy generation com brand voice
  - Padrões de SEO meta description que rankeiam (Ahrefs/SEMrush studies)
  - Benchmark: 3 variações de prompt × 5 produtos reais × medir consistência de tom + conversão
- [x] Documentar prompts finais com exemplos de input/output em `packages/ai/prompts/product-copy/README.md`

**Critérios de pronto:**
- [x] Wrapper `@lojeo/ai` com Claude API: Haiku (alto volume) e Sonnet (premium), seleção por tipo de tarefa
- [x] Geração de descrições via Claude API (tom configurado pelo brand guide do template)
- [x] SEO automático: meta title e meta description otimizados e editáveis
- [ ] Remoção de fundo via Remove.bg no upload de imagem — **PENDENTE Sprint 9**
- [x] Brand guide por instância: tom, pessoa, palavras a evitar/preferir, exemplo de copy
- [x] Cache inteligente em Postgres: hash(prompt + brand_guide + product_data) → resposta. TTL 90 dias.
- [x] Painel de uso de IA: gerações consumidas no mês, custo estimado em USD
- [x] Limites configuráveis por instância com alerta antes do teto + bloqueio automático opcional — `aiMonthlyLimitCents` em settings + `/api/ai-budget` alertas (warn/over_forecast/over) + `checkBudget()` no `@lojeo/ai` wrapper bloqueia chamadas com `AiBudgetExceededError` quando MTD ≥ limit (cache 60s in-memory por tenant). Cache hit não dispara budget check (sem custo novo)
- [x] **Modo econômico opcional (Sec 11.4)** — toggle no admin: usar Haiku no lugar de Sonnet para tarefas de baixa criticidade. Lojista escolhe trade-off custo × qualidade.
- [x] Modo degradado: se Claude API falhar, exibe campos em branco sem quebrar o admin
- [x] Telemetria: cada chamada registra modelo, tokens in/out, custo, latência
- [x] Testes: mock da Claude API nos testes, sem custo real em CI

**Bloqueadores externos:**
- Chave Claude API (Anthropic)

**Decisão arquitetural (IA Engineer):** todo wrapper de IA passa por `@lojeo/ai` para garantir cache + telemetria + cost tracking. Nenhuma chamada direta à Claude API espalhada pelo código.

---

## Sprint 8 — IA Analyst + churn + previsão de estoque

**Objetivo:** Lojista pergunta "por que minhas vendas caíram?" e recebe resposta acionável. Sistema antecipa churn e ruptura de estoque.

**Entregável tangível:** Painel "Insights" no admin onde lojista digita pergunta em linguagem natural → IA consulta dados reais → responde com texto + gráficos + ações sugeridas. Notificações automáticas de churn iminente e estoque crítico.

**🔬 Research-first (OBRIGATÓRIO):**
- [x] `docs/research/sprint-8-churn-stock.md` — pesquisar:
  - Padrão **agentic data analysis**: Vanna.AI, Defog SQLCoder, LangChain SQL Agent, Anthropic tool-calling guide
  - Repos: `vanna-ai/vanna`, `defog-ai/sqlcoder`, `e2b-dev/code-interpreter`, `julianschill/llama-index-pack-text2sql`
  - Shopify Sidekick (referência de UX para chatbot analytics)
  - Best practices Anthropic para tool-use com múltiplas ferramentas (max tools por prompt, descrições, JSON schema)
  - Benchmark de churn: heurística RFM × ML (lifetimes lib em Python) — escolher v1 viável
  - Forecasting de estoque: lib `statsmodels` (Holt-Winters), Prophet, ou heurística de média móvel — comparar precisão × custo
- [ ] Documentar tools, prompts de sistema e prompts de planejamento em `packages/ai/prompts/analyst/README.md` — **PENDENTE (IA Analyst)**

**Critérios de pronto:**

**IA Analyst (insights em linguagem natural):** ✅ v1 ENTREGUE com modo degradado mock
- [x] Interface de chat no admin: `/ia-analyst` client component, markdown renderer simples (negrito/itálico/código/listas/tabelas), histórico sessionStorage, chips de sugestão, Cmd+Enter, badges de tools
- [x] Pattern tool-calling: 5 tools em `/api/ai-analyst` — `revenue_by_period`, `top_products`, `conversion_funnel`, `customer_segments` (RFM via @lojeo/engine), `behavior_aggregates`. Loop tool-calling Claude Sonnet 4.5 (5 iterações máx). Modo degradado sem ANTHROPIC_API_KEY: mockResponse() com markdown + tabela
- [ ] Respostas com gráfico inline (Recharts) — v2
- [ ] Sugestões de ação automáticas — v2 (parcial: chips iniciais já)
- [x] Histórico de perguntas+respostas via sessionStorage (cliente)
- [ ] Cache server-side por hash similarity 24h — v2
- [ ] Rate limit configurável por usuário — v2

**Predição de churn:** ✅ IMPLEMENTADO
- [x] Heurística v1 (sem ML): recencyRatio × 60 + frequencyPenalty × 40 = score 0-100
- [ ] Schema: `customer_churn_score` (user_id, score, reason, calculated_at) — score calculado on-demand via `packages/engine/churn.ts` (sem tabela dedicada v1)
- [ ] Trigger.dev: job semanal recalcula scores — **PENDENTE Sprint 9**
- [x] Alerta no admin: "X clientes em alto risco de churn" + ação sugerida (/insights tab Risco de Churn)

**Previsão de estoque:** ✅ IMPLEMENTADO
- [x] Heurística v1: velocidade de venda 30d/90d → dias até zerar
- [x] Alerta proativo: produto vai zerar em <14 dias → badge critical/warning (/insights tab Previsão de Estoque)
- [x] Sugestão de quanto repor (reorderPoint = leadTime × velocity × 1.2 em `forecastStock()`)

**Monitoramento de concorrência (versão inicial — opcional, descopar se atrasar):**
- [ ] Lojista cadastra URLs de produtos concorrentes
- [ ] Job semanal: scrape preço + disponibilidade
- [ ] Dashboard: variação de preço dos concorrentes ao longo do tempo
- [ ] Sugestão de preço quando há gap significativo

**Bloqueadores externos:** nenhum (usa Claude API já disponível desde Sprint 7)

**Justificativa CFO:** IA Analyst é o feature mais marketável da plataforma. "Pergunte ao seu negócio" — nenhum concorrente nacional tem. Churn + previsão de estoque previnem perdas concretas.

**Custo estimado IA neste sprint (CFO):** Sonnet para análises (~$0.003/1K tokens input + $0.015/1K output). Cache reduz 60-80%. Estimativa: $20-50/mês por loja em uso moderado.

---

## Sprint 9 — FaqZap + chatbot storefront + tickets

**Objetivo:** Lojista não fica no admin para saber o que acontece. Cliente tira dúvidas no widget de chat sem esperar humano.

**Entregável tangível:** Pedido criado → cliente recebe confirmação no WhatsApp com Pix/QR → lojista recebe alerta no seu WhatsApp. Widget de chat no storefront responde dúvidas técnicas usando catálogo + FAQ.

**🔬 Research-first (OBRIGATÓRIO):**
- [x] `docs/research/sprint-9-storefront-chatbot.md` — pesquisar:
  - Shopify Sidekick (storefront chatbot referência), Klaviyo AI, Tidio Lyro, Intercom Fin AI
  - Repos open source: `langchain-ai/customer-support-bot`, `e-commerce-bot` patterns, `chatwoot/chatwoot` (escalation flow)
  - Padrão **RAG híbrido**: catálogo via embeddings + FAQ estruturada via tool calls + busca semântica
  - Anthropic computer use + tool-use docs para chatbot agentic
  - Pesquisar guardrails: anti-jailbreak, escalação, rate limit por sessão
  - Benchmark Haiku vs Sonnet em chatbot e-commerce (custo × resolução)
- [ ] Conexão FaqZap via OAuth 1-clique documentada (preparado se API permitir, fallback API key se não) — **BLOQUEADO: conta FaqZap**
- [x] Documentar prompts de sistema, tools e fluxo de escalação em `packages/ai/prompts/chatbot/README.md`

**Critérios de pronto:**

**FaqZap + notificações:**
- [ ] Integração FaqZap: todos os eventos da seção 17 do doc balisador
- [ ] Notificações ao lojista: novo pedido, pagamento, estoque baixo, avaliação pendente, solicitação de troca, falha fiscal, churn iminente, repor produto
- [ ] Canais configuráveis por evento: email, push (PWA), WhatsApp, Slack
- [ ] Resumo diário no horário escolhido pelo lojista
- [ ] Recuperação de carrinho abandonado via email + WhatsApp (Trigger.dev: job agendado)

**Sistema de tickets:**
- [x] Caixa com histórico, status, responsável, prioridade
- [x] Ticket vinculado ao pedido e ao cliente
- [x] Templates de resposta com variáveis (nome cliente, número pedido, produto) — CRUD completo: API `GET/POST /api/tickets/templates`, `PATCH/DELETE /api/tickets/templates/[id]` + UI `/tickets/templates`
- [x] SLA configurável com alerta visual
- [ ] **Atribuição automática ou manual de tickets (Sec 9.2)** — regras: round-robin por equipe, atribuição por palavra-chave, atribuição manual via drag-and-drop
- [x] **Notas internas** visíveis só pra equipe (não enviadas ao cliente)
- [ ] Escalada do bot FaqZap → ticket no admin — **BLOQUEADO: FaqZap**

**Chatbot storefront (NOVO):**
- [ ] Widget de chat na PDP, PLP e homepage (configurável) — **BLOQUEADO: Design D**
- [x] **Contexto da página atual passado ao chatbot (Sec 17)** — `context.productName` + `context.productId` no body da request
- [x] Tool-calling pattern: Claude Haiku com ferramentas `search_products`, `get_product_details`, `check_stock`, `get_faq_answer`, `escalate_to_human`
- [ ] Catálogo + FAQ injetados como contexto (cache de embeddings em pgvector) — parcial: FAQ estruturada pronta, embeddings pgvector pendente
- [x] Personalidade alinhada ao brand guide do template (system prompt jewelry-v1)
- [x] Rate limit por sessão (anti-abuso): 20 mensagens/15min por sessão
- [ ] Escalação para FaqZap WhatsApp quando bot não resolve — **BLOQUEADO: FaqZap**
- [x] Telemetria: % resoluções pelo bot, % escalações, tópicos mais perguntados — schema `chatbot_sessions` (msgCount, toolCallCount, tokens, escalated, topics) + admin `/chatbot` com cards (total/resolvidas/escaladas/custo) + bar chart top tools, janela 30d
- [x] Modo degradado: se Claude API cair, widget exibe FAQ estática + botão WhatsApp

**Bloqueadores externos:**
- Conta FaqZap

**Decisão UX (estrategista):** chatbot na PDP de joias derruba dúvidas sobre material, aro, quilate, prazo de entrega. Para café internacional, derruba dúvidas sobre origem, processo, frete. Reduz abandono de checkout sem precisar humano disponível 24/7.

**Custo estimado IA (CFO):** Haiku para chatbot (custo ~5x menor que Sonnet). Com rate limit + cache de FAQs comuns, estimativa: $10-30/mês por loja em uso moderado.

---

## Sprint 10 — UGC + galeria + compre o look + moderação

**Objetivo:** Loja vira plataforma de prova social real. Cliente vê outros clientes usando o produto. Galeria UGC alimenta PDP e marketing.

**Entregável tangível:** Cliente posta foto na área logada → lojista aprova no admin → foto aparece na galeria "Como nossos clientes usam" da PDP. "Compre o look" permite tagar produtos em uma foto e linkar diretamente.

**🔬 Research-first (OBRIGATÓRIO):**
- [ ] `docs/research/sprint-10-ugc-moderation.md` — pesquisar:
  - Padrões de moderação visual: AWS Rekognition, Google Vision SafeSearch, Azure Content Moderator (benchmark vs Claude vision para custo × precisão)
  - Yotpo, Bazaarvoice, Foursixty (referências de UGC e-commerce)
  - "Shop the look" patterns: Pinterest, Instagram Shopping, LTK
  - Repos: `awesome-content-moderation`, `microsoft/Cognitive-Samples-IntelligentKiosk`
  - Prompts Claude vision para detectar: nudez, violência, marca concorrente visível, qualidade baixa, conteúdo off-brand
  - Benchmark: 50 imagens-amostra (mix seguro/borderline/inseguro) × 3 prompts × medir false positive/negative
- [ ] Documentar prompts de moderação em `packages/ai/prompts/ugc-moderation/README.md`

**Critérios de pronto:**

**Galeria de clientes (UGC):**
- [x] Schema: `ugc_posts` (user_id, customerEmail/Name, image_url, thumbnail_url, caption, status, products_tagged jsonb, source enum [direct_upload, social_import], ai_moderation_result, moderated_by, moderated_at, rejection_reason)
- [x] Upload direto de foto pelo cliente na área logada — `/conta/galeria` + `POST /api/ugc` com sharp + storage abstrato (full.webp 1600px + thumb 400px)
- [ ] Importação por hashtag/menção em redes sociais — Fase 1.2
- [x] Fila de moderação no admin: aprovar/rejeitar com 1 clique — `/ugc` admin com filtros pending/approved/rejected
- [ ] Detecção automática de conteúdo impróprio (Claude vision call) — research-first cumprido (`docs/research/sprint-10-ugc-moderation.md`); BLOQUEADO: Anthropic key prod
- [ ] Rejeição automática de imagem suspeita + flag para revisão manual — depende item acima
- [x] Galeria "Como nossos clientes usam" na PDP (carrossel) — `<UgcGallery productId>` injetado entre header e reviews
- [x] Galeria geral "Comunidade" como página dedicada — `/comunidade`
- [ ] Cliente recebe email de notificação quando foto é aprovada — BLOQUEADO: Resend API key

**Compre o look:**
- [x] Schema: `ugc_posts.products_tagged` jsonb suporta `[{productId, x, y, label?}]` — base pronta
- [x] API: `PATCH /api/ugc/[id] { productsTagged }` aceita array com x/y posicional
- [x] Storefront: `/api/ugc/gallery?productId=X` filtra fotos com tag do produto via `jsonb @>`
- [ ] Editor no admin: canvas com drag-and-drop tags posicionais — BLOQUEADO: Design Checkpoint C
- [ ] Hover/click em tag exibe card do produto na PDP — depende do editor estar funcional
- [ ] Métrica: cliques em tags + conversão derivada de UGC — depende editor

**Moderação assistida por IA:**
- [ ] Pipeline: upload → Claude vision → score → fila — research feita; BLOQUEADO: Anthropic key prod
- [ ] Fotos seguras vão pra fila normal; suspeitas pra fila urgente — depende pipeline acima
- [ ] Lojista pode definir auto-aprovação para clientes >3 fotos aprovadas — Sprint 11+

**Incentivo (visão UX/marketing):**
- [ ] Email automático pós-entrega: "compartilhe sua experiência" — BLOQUEADO: Resend API key
- [ ] Crédito de loja (gift card automático) por foto aprovada — depende gift card flow Sprint 5 completo
- [ ] Selo "embaixador" para clientes com >5 fotos aprovadas — Sprint 17 (afiliados)

**Justificativa estratégica (UX + marketing):** UGC é gasolina de conversão para joias. Cliente quer ver como o anel fica em mão real, não só foto de estúdio. Conversão típica: +10-20% em PDP com galeria UGC ativa. Custo de aquisição zero — cliente cria conteúdo de graça, plataforma facilita o fluxo.

**Custo IA (CFO):** Claude vision para moderação: ~$0.0008 por imagem. Loja com 100 uploads/mês = $0.08. Negligível.

---

## Sprint 11 — Estúdio criativo IA + motor de recomendação

> ⚠️ **BLOQUEADOR: Design Checkpoint C — UX features de IA NO ADMIN Lojeo**
>
> A interface do estúdio criativo é parte do Design C (admin Lojeo), entregue antes do Sprint 8.
> Atenção: estúdio criativo vive no admin = identidade Lojeo, não do template ativo.

**Objetivo:** Foto de celular vira conjunto profissional. Cada cliente vê produtos relevantes na homepage e na PDP.

**Entregável tangível:** Upload de 1 foto do produto → admin gera 5 composições com cenário, variação de ângulo e lifestyle via IA. Homepage e PDP mostram produtos recomendados baseados em comportamento.

**🔬 Research-first (CRÍTICO — maior custo de IA da plataforma):**
- [ ] `docs/research/sprint-11-image-generation.md` — pesquisar **profundamente** por modelo:
  - **Flux 1.1 Pro** (Black Forest Labs via fal.ai/Replicate): prompts de produto, negative prompts, seed/steering, custo $0.04/img
  - **DALL-E 3** (OpenAI): style/quality params, prompt rewriting interno, custo $0.04-0.08/img, limitações comerciais
  - **Ideogram 2.0**: melhor para texto na imagem (rótulos, embalagem), custo $0.08/img
  - **Stable Diffusion 3 Large** (Stability via fal.ai): controlnet, img-to-img, custo $0.035/img
  - **Recraft V3**: especializado em design/produto/vetor, custo $0.04/img
  - **Midjourney v7** (via API não-oficial ou aguardar oficial): qualidade líder, custo via créditos
  - **Nano Banana** (Gemini 2.5 Flash Image): edição de imagem com referência, custo baixo
  - Repos referência: `black-forest-labs/flux`, `Stability-AI/sdxl-prompts`, `awesome-stable-diffusion`, `mikubill/sd-webui-controlnet`, prompt libraries (Lexica, Civitai categorias)
  - Casos de sucesso e-commerce: Pebblely, Booth.ai, Photoroom AI, Stylar AI (estudar UX e prompts inferidos)
  - Estratégia de seed/variation/upscale para previsibilidade
  - Img-to-img com produto real → composição nova preservando produto (CRÍTICO — produto real do lojista, não inventado)
  - **Vídeo:** Veo 3 (Google), Runway Gen-3, Pika 1.5, Kling — comparar custo (geralmente $0.50-2/clip de 5s) × qualidade × API maturity
- [ ] `docs/research/sprint-11-recommendations.md` — pesquisar:
  - Recombee, Algolia Recommend (referências comerciais)
  - Repos: `microsoft/recommenders`, `RUCAIBox/RecBole`, `NVIDIA-Merlin/models`
  - Two-tower model vs collaborative filtering vs hybrid (custo × precisão)
  - Embeddings de produto: text-embedding-3-large vs Cohere embed-v3 vs Voyage AI vs sentence-transformers local
- [ ] **Benchmark obrigatório:** mesmo produto (joia real) × 3 modelos × 3 prompts cada = 9 imagens. Avaliar custo, qualidade, fidelidade ao produto, consistência. Decisão registrada em `DECISION_LOG.md`.
- [ ] Documentar prompts finais (template + variações) em `packages/ai/prompts/creative-studio/README.md`

**Critérios de pronto:**

**Estúdio criativo IA:**
- [ ] Integração com provider de geração de imagem (decisão pendente — ver decisões estratégicas)
- [ ] Composições com cenário configurável pelo template
- [ ] Variações de ângulo
- [ ] Lifestyle com modelo/cenário
- [ ] Troca de fundo (alternativa avançada ao Remove.bg)
- [ ] Pipeline Trigger.dev: job assíncrono de geração (não bloqueia o admin)
- [ ] Cache: composição já gerada para o mesmo produto é reaproveitada
- [ ] Geração de vídeo: rotação 360° + composição animada (provider a definir)
- [ ] Modo degradado: se provider falhar, admin exibe mensagem clara sem quebrar
- [ ] Painel de uso atualizado (integração com Sprint 7)

**Motor de recomendação (NOVO):**
- [ ] Schema: `product_recommendations` (tenant_id, product_id, recommended_product_id, score, reason, calculated_at)
- [ ] Schema: `product_embeddings` em pgvector (descrição + atributos + categoria → vetor)
- [ ] Trigger.dev: job noturno calcula:
  - Content-based: produto similar via embedding de descrição/atributos
  - Collaborative "quem comprou X também comprou Y" (a partir de pedidos)
  - **Frequentemente comprado junto (Sec 21)** — pares de produtos que aparecem no mesmo pedido com frequência (market basket analysis). Diferente de "também comprou" — exibe combo na PDP e carrinho.
  - Behavioral: "quem viu X também viu Y" (a partir de behavior_events)
- [x] **Ajuste manual no admin (Sec 6.2)** — schema `recommendation_overrides` (productId, recommendedProductId, overrideType pin/exclude); API admin CRUD `/api/recommendations/overrides`; UI `/products/[id]/recommendations` com radio pin/exclude + autocomplete catálogo + tabelas separadas; storefront `/api/recommendations` aplica overrides (pin no topo, exclude filtrados, dedup, respeita limit)
- [x] API `/api/recommendations?productId=X&type=fbt` retorna top N — implementado para FBT (frequentemente comprado junto), cache 60s em memória, pedidos pagos últimos 180d
- [x] Componente `<RelatedProducts />` na PDP usando recomendações — heurística sem ML: coleções compartilhadas (via product_collections join) → fallback customFields.categoria → fallback produtos mais recentes. API `/api/products/related?productId=X&limit=N`. IntersectionObserver lazy load. Embeddings refinarão Sprint 12+
- [x] Componente `<FrequentlyBoughtTogether />` na PDP e carrinho — engine puro `packages/engine/src/market-basket.ts` (support/confidence/lift, score = lift × log(cooccurrence+1)), 6 testes (engine 28→34), IntersectionObserver lazy load, injetado PDP + `<FrequentlyBoughtTogetherCart>` em /carrinho (anchor primeiro item, filtra cart items)
- [ ] Componente `<YouMayAlsoLike />` no carrinho
- [x] Tracking de cliques em recomendações (CTR mensurável) — eventos `recommendation_impression`/`recommendation_click` em behavior_events.metadata.source ∈ {fbt_pdp, fbt_cart, related_pdp}, instrumentado em FBT PDP/Carrinho + RelatedProducts via useTracker(); endpoint admin `/api/recommendations/ctr?days=7|30|90` agrega impressions+clicks+ctr por fonte; UI `/recomendacoes/ctr` cards summary + tabela com badges por benchmark (alto ≥5%, médio ≥2%, baixo <2%)
- [x] Modo degradado: sem recomendações personalizadas, exibe "mais vendidos da categoria" — quando `topPairsForProduct` retorna empty, fallback `fallbackBestsellers()`: identifica coleções via product_collections → busca produtos das mesmas coleções → ranqueia por count de orderItems pagos últimos 90d (pedidos paid/preparing/shipped/delivered) → resposta com `reason: 'fallback_bestsellers'`. Sem coleção: produtos mais recentes do tenant. Excludes (override) respeitados em ambos paths

**Decisão estratégica necessária antes deste sprint:**
Qual provider de geração de imagem? Trade-off custo vs qualidade vs API reliability. Stakeholder decide.

**Justificativa arquitetural:** recomendações precisam de embeddings + behavior_events + pedidos. Tudo já existe nesse ponto. Adicionar motor agora é barato; adicionar depois exige refatorar PDP, carrinho, homepage.

---

## Sprint 12 — Busca semântica + pixels + SEO + Clarity-IA + homepage personalizada

**Objetivo:** Tráfego orgânico e pago funcionando, rastreável, e cada visitante recorrente vê uma loja personalizada.

**Entregável tangível:** Busca por "anel dourado para noivado" retorna produtos relevantes. Compra rastreada no Meta Pixel e GA4. Homepage exibe produtos diferentes para cada cliente. Insights do Clarity são consumidos pela IA para gerar sugestões automáticas.

**🔬 Research-first (OBRIGATÓRIO):**
- [ ] `docs/research/sprint-12-semantic-search.md` — pesquisar:
  - Hybrid search (BM25 + dense vector): Weaviate docs, Qdrant docs, pgvector + tsvector pattern
  - Repos: `castorini/pyserini`, `qdrant/qdrant`, `pgvector/pgvector` examples
  - Algolia (referência), Typesense (open source competitor)
  - Reranking com Cohere Rerank ou bge-reranker (uplift de precisão)
  - Estratégia de embedding para e-commerce (produto + categoria + atributos como single doc)
- [ ] `docs/research/sprint-12-clarity-ai-insights.md` — pesquisar:
  - Microsoft Clarity API (data export, sessões, heatmaps)
  - Patterns para análise de heatmap por LLM (transformar em descrição estruturada antes de enviar)
  - Repos: `microsoft/clarity`, exemplos de Clarity insights via IA
- [ ] `docs/research/sprint-12-personalization.md` — pesquisar:
  - Real-time personalization patterns: Dynamic Yield, Bloomreach, Algolia Personalization
  - Cold-start strategies (visitante novo) vs warm (recorrente)
  - Segmentation × individualization trade-off
- [ ] Documentar abordagens em `packages/ai/prompts/clarity-insights/README.md`

**Critérios de pronto:**

**Busca semântica:**
- [ ] Embeddings de produtos em pgvector (já criados no Sprint 11 reusados)
- [ ] Busca por intenção: query → embedding → similarity search
- [ ] Híbrido: combina semântica + full-text para melhor precisão
- [ ] Telemetria: query → resultado clicado → conversão

**Pixels e analytics:**
- [x] Google Tag Manager: container único injetado pelo motor — config-driven via `tenants.config.pixels.gtmId` + `<Pixels>` next/script (OAuth 1-clique pendente, IDs manuais via /settings)
- [x] GA4: funil completo, receita, LTV, origem — config-driven `gaTrackingId` (Conversions API server-side + pixels OAuth 1-clique pendentes)
- [x] Meta Pixel: pixel client-side — config-driven `metaPixelId` (Conversions API server-side + Facebook Login OAuth pendentes)
- [x] TikTok Pixel — config-driven `tiktokPixelId` (TikTok for Business OAuth pendente)
- [x] Google Ads Conversion Tracking — config-driven `googleAdsConversionId` (OAuth Google Ads pendente)
- [x] Microsoft Clarity — config-driven `clarityProjectId` (OAuth 1-clique pendente)
- [ ] Parâmetros UTM preservados até o pedido
- [x] **Atribuição multi-touch configurável (Sec 12.2)** — last-click v1 funcional via UTM snapshot em orders. UI `/atribuicao` admin com selector modelo (last_click | first_click | linear) + janela 7/30/90d + tabela source/medium/campaign/orders/revenue/AOV/conv%. first_click + linear placeholders v1 (precisam path completo de behavior_events)
- [x] Funil de conversão nativo com taxa em cada etapa (independente de pixel externo) — API `/api/funnel?days=N` agrega behavior_events em 4 estágios (product_view → cart_add → checkout_start → checkout_complete), conversão por estágio + total geral, drop-off absoluto/relativo. UI `/insights` aba Funil com bar chart visual horizontal

**SEO:**
- [x] Schema.org parcial: Product (PDP) ✓, BreadcrumbList (PDP) ✓; Organization e WebSite pendentes; rating de produto pendente
- [ ] Redirects 301 automáticos quando produto é arquivado ou URL muda
- [ ] hreflang preparado (ativado na Fase 1.2 multi-idioma)
- [ ] Blog/conteúdo nativo: lojista publica guias, IA ajuda na escrita

**Clarity + IA (NOVO — seção 11.5 do doc balisador):**
- [ ] Job noturno (Trigger.dev) consome API do Clarity: heatmaps, scroll maps, sessões agregadas
- [ ] IA analisa padrões: zonas mortas, frustrações (rage clicks), abandono de scroll
- [ ] Cruza com dados de venda: "PDPs onde scroll para baixo é raro têm 40% menos conversão"
- [ ] Insights automáticos no painel de IA Analyst (aparece junto com insights de venda)
- [ ] Sugestões acionáveis: "as duas primeiras imagens deste produto precisam ser mais impactantes"

**Homepage personalizada (NOVO — seção 11.2 do doc balisador):**
- [x] Cliente identificado: homepage exibe produtos baseados em histórico — `<RecommendedForYouSection>` server component em `/` busca pedidos pagos do email logado últimos 365d → identifica produtos comprados → resolve coleções via product_collections → sugere top 4 produtos das mesmas coleções (excl. já comprados) ordenados por created_at DESC. Bloco "Para você · Combinam com seu estilo" inserido antes de "Recém-criadas"
- [x] Cliente anônimo recorrente (mesmo fingerprint): personalização por sessões anteriores — `<AnonAffinitySection>` client component lê `anonymousId` localStorage via getAnonId() → `GET /api/recommendations/affinity?anonymousId=X`. API agrega `behavior_events` eventType=product_view últimos 30d, identifica produtos com count >= 2 (engajamento real), resolve coleções via product_collections, retorna top 4 produtos das mesmas coleções (excl. já vistos) ordenados por created_at DESC. Renderiza apenas quando há histórico ("Você gostou destas / Continue explorando"). Modo degradado: null silencioso quando sem histórico ou erro
- [x] Cliente novo: fallback para "mais vendidos" + "novidades" — `<RecommendedForYouSection>` retorna null para anônimos/sem pedidos; homepage exibe "Recém-criadas" default (newArrivals query products ORDER BY created_at DESC LIMIT 4) que é o equivalente "novidades"
- [x] Componente `<PersonalizedHero />` substitui hero estático para clientes recorrentes — server component em `apps/storefront/src/components/marketing/personalized-hero.tsx`. Detecta segmento RFM via `scoreCustomers()` engine puro (champions/loyal/at_risk/lost/new/promising/other) baseado em pedidos pagos do customerEmail; cópia headline+subheadline+CTA personalizada por segmento via `SEGMENT_COPY` map mantendo tom editorial jewelry-v1; passa props customizadas pro `<HeroExperiment>` (preserva A/B variant override quando configurado). Anônimos/sem pedidos: defaults gerais. Modo degradado: try/catch em torno de auth + DB
- [ ] A/B test: personalizada vs default → mede uplift de conversão — v2 (depende de telemetria recommendation_impression/click já existente vs assignment expo)
- [x] Modo degradado: se motor de recomendação cair, exibe homepage default — try/catch em `RecommendedForYou()` em torno de auth() + cada query DB; falha silenciosa retorna null e homepage exibe blocos default sem afetar TTFB

**Sugestão de recompra storefront (NOVO):**
- [x] Área logada exibe "está na hora de repor?" baseado em ciclo + garantia — `<RebuySuggestion>` em `/conta/pedidos`, ciclo = warrantyMonths × 0.85, status due_now/soon, top 3 sugestões
- [ ] Email automático com sugestão de recompra (Trigger.dev: job semanal) — BLOQUEADO Trigger.dev + Resend
- [ ] Sugestão de presente: aniversário cadastrado + sugestão de produto coerente

**Justificativa CFO:** Clarity+IA + homepage personalizada são features de retenção e otimização que se pagam em 30-60 dias se a loja tem >500 visitantes/dia. Custo de implementação concentrado neste sprint, ganho contínuo.

---

## Sprint 13 — Polimento + segurança + produção

**Objetivo:** Loja pronta para vender de verdade. Zero dívida técnica crítica.

**Entregável tangível:** Auditoria de segurança passando, Core Web Vitals no verde, backup automatizado testado, modo degradado validado para todos os serviços externos.

**Critérios de pronto:**
- [ ] Security audit completo (rate limiting + sanitização + validação tipo upload) — CSRF entregue parcial: middleware admin verifica Origin/Referer em POST/PATCH/DELETE com ALLOWED_ORIGINS allowlist, exempta /api/migrate e /api/webhooks/*, retorna 403 csrf_origin_required/blocked. **Rate limiting expandido:** helper `apps/storefront/src/lib/rate-limit.ts` (in-memory por instância, single-instance EasyPanel OK; v2 trocar por Redis/Upstash). Aplicado em `/api/orders POST` (10 pedidos/15min/IP — anti-fraude/bot), `/api/coupons/validate GET` (60 validações/15min/IP — anti-brute-force). `/api/chat` já tinha (20 msgs/15min/sessionId). Pendente: `/api/track` POST, upload validação file-signature já existe no engine. Sanitização Zod: parcial em mutations.
- [ ] LGPD: banner de cookies com consentimento granular (já tem desde Sprint 2 — auditar)
- [x] LGPD: direito de exclusão (right to be forgotten) implementado e testado — `/conta/privacidade` UI + `GET /api/conta` (export JSON) + `DELETE /api/conta` (anonimiza orders, deleta PII + behavior_events + ugc + reviews + wishlist + addresses + sessions + users)
- [ ] GDPR: básico para coffee internacional na Fase 1.2 (preparação)
- [ ] Core Web Vitals dentro dos limites do Google
- [x] PWA: instalável no celular — manifest dinâmico, service worker shell-cache (network-first, exclui /api/checkout/conta), theme-color, apple-touch-icon. Push notifications pendente (Sprint 13 v2)
- [x] Acessibilidade WCAG 2.1 AA — `@axe-core/playwright` + `@playwright/test` setup, test `tests/a11y.spec.ts` varre 9 rotas com tags wcag2a/wcag2aa (falha em violations critical, loga demais). Fixes aplicados: aria-hidden em SVG icons globalmente (icon.tsx), aria-label em logo+busca+botões, `<nav aria-label>` em menus, useId+htmlFor em forms (entrar, checkout/endereco, conta/galeria), role="alert" em erros, skip-link "#main-content", contraste --text-muted aumentado para 5.7:1 (#6B6055), aria-live="polite" no ConsentBanner
- [x] **Carregamento progressivo / lazy loading (Sec 16)** — UgcGallery com IntersectionObserver (rootMargin 300px) + skeleton placeholder + loading=lazy + decoding=async nas imgs; fetch só dispara quando galeria proxima do viewport. Padrão reusável para galeria/recomendações.
- [ ] **CDN global Cloudflare (Sec 16)** — assets servidos do POP mais próximo do cliente. Crítico para coffee/internacional. Imagens via R2 com transformações on-the-fly.
- [x] Backup automático diário no Neon (retenção 30 dias) — `scripts/backup-db.sh` com `pg_dump --no-owner --quote-all-identifiers | gzip -9` salvando em `./backups/backup-YYYY-MM-DD-HHMMSS.sql.gz`; retenção 30d via `find -mtime +30 -delete`; upload R2 opcional via rclone quando `R2_BUCKET` setado; cron diário 03:00 BRT documentado em `docs/operations/backup-strategy.md`. Falta apenas instalar cron na VPS produção (depende SSH EasyPanel)
- [x] Procedimento de restore testado e documentado — `gunzip -c backup.sql.gz | psql $DATABASE_URL` para banco vazio; `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` antes de re-aplicar dump em banco existente; documentado em `docs/operations/backup-strategy.md`. Restore em banco sandbox testado mensalmente = TODO
- [ ] Modo degradado validado em testes: IA fora, gateway secundário, serviço de email fora, FaqZap fora
- [x] Status page pública da loja — `/status` com 6 checks (DB, catálogo, IA Claude, storage, Resend, MP), badges operational/degraded/down, tempos de resposta, mensagens explicativas. API `/api/status` para integração externa
- [ ] Testes E2E com Playwright: fluxo completo compra, troca, login, wishlist, gift card
- [x] Plano de contingência Black Friday documentado — `docs/operacoes/contingencia-black-friday.md` (~2.500 palavras): pré-evento D-30 a D-1 (técnico/operacional/marketing/financeiro), durante (war room + triggers + rollback + degraded modes em camadas), pós-evento (post-mortem + cleanup + retenção), comunicação cliente, plano B catastrófico (Cloudflare landing fallback)
- [x] Auditoria de custo IA: tabela com estimativa mensal por feature, alertas configurados — API `/api/ai-budget` (limite, MTD, projeção fim do mês, utilization%, alert ok/warn/over_forecast/over) + card de orçamento em `/ia-uso` com progress bar, mensagem de alerta colorida
- [x] Documentação do operador final (lojista) — `docs/manual-lojista/` com 9 seções (~4.300 palavras): primeiros-passos, gestão produtos/pedidos/clientes, marketing, configurações, IA, LGPD, FAQ. PT-BR formal mas amigável (perfil MEI), passos numerados, callouts 💡⚠️🚫, links cruzados

---

## Design checkpoints — quando e o que entregar ao Claude Design

> **Protocolo:** Claude Code (este plano) gera briefing detalhado. Stakeholder revisa, ajusta se necessário, e leva ao Claude Design. Entrega volta como Tailwind tokens + especs de componentes + Figma/imagens. Claude Code implementa usando o entregue.

> **CRÍTICO — declarar camada em todo briefing:** cada briefing abaixo identifica explicitamente se está desenhando o **Lojeo (sistema/admin/marca SaaS)** ou um **template** (jewelry-v1, coffee-v1). Confundir as camadas resulta em design incoerente — admin com cara de joalheria, ou template de joias com cara de SaaS corporativo.

### 🎨 Design Checkpoint A — Identidade do Lojeo (sistema/produto SaaS)

**Camada:** Lojeo (sistema, admin, marca corporativa do produto SaaS)

**Bloqueia:** Sprint 0 (logo no admin login) parcialmente, Sprint 5 (admin operacional completo) totalmente

**Solicitar:**
- **Marca Lojeo:** logo, símbolo, paleta corporativa, tipografia institucional, tom de voz da marca-mãe
- **Design system do admin:**
  - Tokens neutros que servem qualquer nicho (paleta, tipografia, espaçamentos, radii, sombras)
  - Densidade (denso vs espaçoso) — definir com stakeholder
  - Tema (light/dark/switcher) — definir com stakeholder
- **Componentes-base do admin:** botões, inputs, tabelas, cards, modais, drawers, toasts, tabs, navegação lateral, filtros, batch actions, paginação, search universal
- **Padrão "fator moleza":** instruções contextuais, microcopy, estados vazios bem desenhados
- **Estados:** vazio, erro, loading, sucesso

**NÃO incluir aqui:** identidade visual de joias ou café — isso vem nos checkpoints B e C.

---

### 🎨 Design Checkpoint B — Template jewelry-v1 (storefront da loja de joias BR)

**Camada:** Template aplicado na instância joias.dominio.com (NÃO é o Lojeo)

**Bloqueia:** Sprint 2 (storefront)

**Solicitar:**
- Sistema de design completo do template jewelry-v1 (independente da identidade Lojeo)
- Design tokens do nicho joias premium: paleta, tipografia (3–5 combinações curadas conforme Sec 3.3), espaçamentos, sombras, raios
- Layouts: homepage, PLP, PDP, carrinho, checkout (multi-step), conta do cliente, página de rastreamento branded, páginas estáticas
- Estados: hover, foco, erro, vazio, loading, sucesso
- Componentes: card de produto, galeria de imagens/vídeos, badge de urgência (pessoas vendo agora / vendas hoje / estoque baixo), avaliações com nota+foto, trust signals
- **Slots reservados (preparação):**
  - Galeria UGC na PDP (Sprint 10)
  - Widget chatbot canto inferior direito (Sprint 9) — segue identidade do template, não do Lojeo
  - Recomendações: `RelatedProducts`, `FrequentlyBoughtTogether`, `YouMayAlsoLike` (Sprint 11)
  - Hero personalizado vs default (Sprint 12)
- Formato de entrega: pacote `templates/jewelry-v1/` com tokens + especificações + Figma

### 🎨 Design Checkpoint C — UX features de IA NO ADMIN (extensão do design system Lojeo)

**Camada:** Lojeo (admin) — reusa tokens do Checkpoint A

**Bloqueia:** Sprint 8 (IA Analyst), Sprint 10 (Editor compre o look), Sprint 11 (Estúdio criativo)

**Solicitar:** (todos os componentes seguem identidade do Lojeo, NÃO de joias/café)
- **IA Analyst (Sprint 8):**
  - Interface conversacional (estilo chat) com input de pergunta + histórico
  - Renderização de respostas: texto + gráficos inline (line, bar, donut, funnel)
  - Cards de "ações sugeridas" ao final de cada análise
  - Estados: gerando resposta (skeleton), erro de IA, sem dados suficientes
  - Painel lateral: histórico de perguntas + favoritos
- **Painel de uso de IA (Sprint 7+):**
  - Visualização de consumo por feature (descrições, imagens, chatbot, analyst)
  - Custo estimado em USD + alerta visual de teto
  - Toggle modo econômico (Haiku vs Sonnet) com explicação clara do trade-off
- **Estúdio criativo no admin (Sprint 11):**
  - Fluxo de upload → configurar composição → visualizar resultado → salvar/descartar
  - Estados de loading para geração (30–60s) — feedback de progresso
  - Grid de resultados com comparador antes/depois
  - Selector de estilo/cenário (presets + custom prompt)
  - Histórico de gerações por produto
- **Editor "compre o look" no admin (Sprint 10):**
  - Canvas com foto UGC + tags posicionáveis (drag & drop)
  - Search de produto inline para tagear
  - Preview do hover/click do cliente
- **Editor de homepage personalizada no admin (Sprint 12):**
  - Editor de seções dinâmicas
  - Variantes de hero (cliente novo, cliente recorrente, cliente VIP)
  - Visualização "preview as user X" no admin
- Formato de entrega: extensões do design system Lojeo + especificações + Figma

### 🎨 Design Checkpoint D — Componentes IA no STOREFRONT do template jewelry-v1

**Camada:** Template jewelry-v1 (storefront) — extensão do Checkpoint B

**Bloqueia:** Sprint 9 (chatbot widget no storefront), Sprint 12 (homepage personalizada visual)

**Solicitar:** (todos os componentes seguem identidade do template ativo, NÃO do Lojeo)
- **Widget chatbot no storefront (Sprint 9):**
  - Visual de bolha de chat + estados (minimizado, expandido, digitando, mensagem do bot, mensagem do humano após escalação)
  - Cards de produto inline na conversa (quando bot sugere produto) — usando estilo de card do template
  - Botão "falar com humano" (escalação visual)
- **Homepage personalizada visual (Sprint 12):**
  - Variações visuais do hero (cliente novo, cliente recorrente, cliente VIP) dentro do mood do template
  - Componentes de recomendação visual (Frequentemente comprado junto, Você também pode gostar)
- Formato de entrega: extensões do template `templates/jewelry-v1/` + Figma

### 🎨 Design Checkpoint E — Template coffee-v1 (Fase 1.2)

**Camada:** Template aplicado na instância coffee.domain.com (NÃO é o Lojeo, NÃO é jewelry-v1)

**Bloqueia:** Sprint 14 (Fase 1.2)

Briefing dedicado gerado quando Fase 1 joias estiver estável em produção. Identidade completamente diferente de jewelry-v1 — café artesanal internacional.

---

## Fase 1.2 — Template café + internacional (após Sprint 13)

Após a loja de joias estável em produção por pelo menos 4 semanas:

| Sprint | Tema | Destaque |
|---|---|---|
| 14 | Template café + internacionalização | i18n, endereço adaptativo, tipografia própria |
| 15 | Pagamentos internacionais + fiscal | Stripe, PayPal, commercial invoice |
| 16 | Plano de assinatura recorrente | Qualquer produto em ciclo recorrente |
| 17 | Marketplaces iniciais | Google Shopping, Meta Catalog, Etsy, Amazon Handmade |
| 18 | Métricas estratégicas avançadas | CAC, LTV, coorte, NPS automático via FaqZap |
| 19 | Afiliados + embaixadores | Painel dedicado, código pessoal, comissão (reusa UGC + selo embaixador do Sprint 10) |
| 20 | Send time optimization + precificação dinâmica | IA decide horário de envio + preço ótimo |

---

## Fase 2 — SaaS multi-tenant (after Fase 1.2)

Funcionalidades reservadas para Fase 2 SaaS — **não implementar na Fase 1**:
- Setup wizard com IA para onboarding (Seção 3.1 do doc) — só faz sentido com onboarding self-service
- Marketplace de templates com comissão para designers externos
- Planos com cota de IA + créditos pré-pagos
- Upgrade automático de tenants (migrations multi-tenant)
- Painel master para gerenciar tenants

---

## Decisões estratégicas pendentes (aguardam stakeholder)

| Sprint | Decisão | Impacto |
|---|---|---|
| 0 | Apple Login no sprint 0 ou depois? | Custo $99/ano Apple Developer, burocracia |
| 3 | Mercado Pago ou Pagar.me como primário? | Taxas, suporte, integração |
| 4 | Bling ou Olist para NF-e? | Custo mensal, API, suporte |
| 8 | Monitoramento de concorrência fica neste sprint ou descopa? | Scraping pode ser frágil; descopar é seguro |
| 11 | Provider de geração de imagem? | Custo/qualidade/API (Ideogram, Flux, DALL-E 3) |
| 12 | Personalização de homepage: A/B test obrigatório no lançamento? | Decisão de produto + UX |

---

## Complexidade por sprint

| Sprint | Complexidade | Justificativa |
|---|---|---|
| 0 | Média | Config intensiva, pouca lógica de negócio |
| 1 | Média-Alta | Catálogo + tracking foundation simultâneos |
| 2 | Alta | Design externo + template system + SSR + instrumentação completa |
| 3 | Alta | Webhooks + idempotência + sandbox tests |
| 4 | Média-Alta | 3 integrações externas simultâneas |
| 5 | Média-Alta | Admin CRUD + 4 features de retenção |
| 6 | Alta | Fluxo de estados + logística reversa + fiscal + RFM |
| 7 | Média | IA relativamente isolada, caching é o desafio |
| 8 | Alta | IA Analyst (tool-calling) + heurísticas de churn/estoque |
| 9 | Alta | FaqZap + chatbot tool-calling + tickets + rate limiting |
| 10 | Média-Alta | Upload + moderação IA + compre o look + UI nova |
| 11 | Alta | IA assíncrona + jobs longos + UX complexa + motor de recomendação |
| 12 | Alta | Pixels + Clarity-IA + homepage personalizada (3 frentes) |
| 13 | Alta | Testes E2E + segurança + auditoria não têm atalho |

---

## Custo estimado de IA — visão CFO (por loja, mês 1 de produção)

| Feature | Modelo | Volume estimado | Custo/mês |
|---|---|---|---|
| Descrições + SEO (Sprint 7) | Sonnet | 50 produtos novos × 2 chamadas | $5–10 |
| IA Analyst (Sprint 8) | Sonnet | 30 perguntas/mês com tool calls | $15–30 |
| Chatbot storefront (Sprint 9) | Haiku | 500 sessões × 5 mensagens | $10–20 |
| Moderação UGC (Sprint 10) | Claude vision | 100 imagens | <$1 |
| Estúdio criativo (Sprint 11) | Provider externo | 20 gerações premium | $20–40 |
| Recomendações (Sprint 11) | Embeddings | 1× por novo produto | <$2 |
| Clarity insights (Sprint 12) | Sonnet | 1 análise/dia | $5–10 |
| **Total estimado** | | | **$56–113/mês** |

**Ponto de atenção:** com cache funcionando bem (esperado 60-80% hit rate em consultas repetidas), custo real fica na faixa baixa da estimativa. Sem cache, sobe para $150-250/mês — daí a obrigatoriedade do `@lojeo/ai` wrapper desde o Sprint 7.

---

## Mudanças desta revisão (vs versão original 2026-04-25)

1. **Sprint 1 expandido:** adicionada tracking foundation (schema + SDK) — fundação não-negociável para personalização e IA Analyst
2. **Sprint 2 estendido para 3 semanas:** instrumentação behavioral em todas as superfícies do storefront
3. **Sprint 5 estendido para 3 semanas:** wishlist + gift card + back-in-stock + opção de presente (4 features de retenção, ROI alto)
4. **Sprint 6 expandido:** segmentação RFM automática + sugestão de recompra
5. **Sprint 8 NOVO:** IA Analyst (insights linguagem natural) + churn + previsão de estoque
6. **Sprint 9 expandido:** chatbot storefront com tool-calling integrado ao FaqZap
7. **Sprint 10 NOVO:** UGC completo (galeria + compre o look + moderação IA)
8. **Sprint 11 expandido:** motor de recomendação (content + collaborative + behavioral)
9. **Sprint 12 expandido:** Clarity+IA + homepage personalizada + sugestão de recompra storefront
10. **Sprint 13 expandido:** validação de modo degradado para todos os serviços + auditoria de custo IA
11. **Total Fase 1:** 24 → 30 semanas (+6 semanas, +25%)
12. **Setup wizard com IA** explicitamente postergado para Fase 2 SaaS
