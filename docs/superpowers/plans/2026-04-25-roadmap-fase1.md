# Lojeo — Plano de Desenvolvimento Fase 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor único de e-commerce com template de joias em produção vendendo de verdade, validando o mercado BR.

**Architecture:** Monorepo Next.js 15 (App Router) com packages compartilhados para engine, DB (Drizzle + Neon) e UI. Motor não conhece nicho — carrega template via configuração de instância. Multi-tenant por `tenant_id` desde o dia 1.

**Tech Stack:** Next.js 15, TypeScript, pnpm workspaces + Turborepo, Neon (PostgreSQL), Drizzle ORM, Auth.js v5, Trigger.dev (self-hosted), Cloudflare R2, Resend, shadcn/ui + Tailwind v4, Vitest + Playwright.

**Regra de ouro:** O motor (`packages/engine`) não pode importar nada de `templates/`. Templates são carregados via configuração de instância.

---

## Mapa de sprints

| Sprint | Tema | Duração | Bloqueador externo |
|---|---|---|---|
| 0 | Fundação técnica | 2 semanas | — |
| 1 | Motor + catálogo | 2 semanas | — |
| 2 | Storefront base | 2 semanas | **🎨 Design #1 (jewelry-v1)** |
| 3 | Checkout + pagamentos BR | 2 semanas | Conta Mercado Pago |
| 4 | Pedidos + frete + fiscal | 2 semanas | Conta Bling + Melhor Envio |
| 5 | Admin operacional | 2 semanas | — |
| 6 | CRM + garantias + trocas | 2 semanas | — |
| 7 | IA backoffice v1 | 2 semanas | Chave Claude API |
| 8 | FaqZap + notificações + tickets | 2 semanas | Conta FaqZap |
| 9 | Estúdio criativo IA | 2 semanas | **🎨 Design #2 (estúdio)** + API imagem |
| 10 | Busca semântica + pixels + SEO avançado | 2 semanas | — |
| 11 | Polimento + segurança + produção | 2 semanas | — |

**Total estimado Fase 1 (joias):** ~24 semanas (~6 meses)

---

## Sprint 0 — Fundação técnica

**Objetivo:** Repositório rodando, banco conectado, deploy funcional no EasyPanel, CI/CD verde.

**Entregável tangível:** `https://joias.seudominio.com` mostrando página "em breve", admin acessível com login Google, pipeline de CI passando.

**Critérios de pronto:**
- [ ] Monorepo com pnpm workspaces + Turborepo buildando sem erros
- [ ] Schema inicial no Neon com `tenant_id` em todas as tabelas base
- [ ] Auth.js v5 com Google OAuth funcionando no admin
- [ ] Trigger.dev self-hosted rodando no EasyPanel
- [ ] Cloudflare R2 bucket configurado (storage abstrato no código)
- [ ] GitHub Actions: lint + typecheck + test em cada PR
- [ ] Deploy automático para EasyPanel em merge na main
- [ ] `DECISION_LOG.md` criado com as decisões da Etapa 2

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
│   └── ui/                  # Componentes shadcn compartilhados
├── templates/
│   ├── jewelry-v1/          # Design tokens, campos, tom de voz
│   └── coffee-v1/           # (vazio até Sprint 12)
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

---

## Sprint 1 — Motor + catálogo básico

**Objetivo:** Lojista consegue cadastrar produtos com variantes, fotos e estoque no admin.

**Entregável tangível:** Admin funcional (sem design final) onde é possível criar, editar e arquivar produtos com variantes e galeria de imagens.

**Critérios de pronto:**
- [ ] Entidades no banco: `tenant`, `product`, `product_variant`, `product_image`, `collection`, `inventory`
- [ ] Upload de imagens → R2 com otimização automática (WebP, thumbnails)
- [ ] CRUD completo de produtos via API (Next.js Route Handlers)
- [ ] Campos obrigatórios: nome, descrição rich text, preço, preço promocional, custo, SKU, status, URL amigável
- [ ] Variantes com até 3 dimensões, estoque e preço por variante
- [ ] Coleções: criação manual e por regras automáticas
- [ ] SEO por produto: meta title, meta description, Open Graph editáveis
- [ ] Campos customizados por template (joias: material, pedra, quilate, tamanho, aro)
- [ ] Garantia e política de troca configuráveis por produto
- [ ] NCM e regime tributário por produto
- [ ] Importação básica via CSV
- [ ] Testes unitários: motor de catálogo (Vitest)

**Schema Drizzle — tabelas principais:**

```typescript
// packages/db/src/schema/catalog.ts
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // centavos
  compareAtPrice: integer('compare_at_price'),
  cost: integer('cost'),
  sku: varchar('sku', { length: 100 }),
  status: productStatusEnum('status').default('draft'),
  // campos fiscais
  ncm: varchar('ncm', { length: 8 }),
  taxRegime: varchar('tax_regime', { length: 50 }),
  // garantia
  warrantyMonths: integer('warranty_months'),
  exchangePolicyDays: integer('exchange_policy_days'),
  // metadados do template
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Complexidade:** Média. Upload + R2 + variantes são as partes mais trabalhosas.

---

## Sprint 2 — Storefront base

> ⚠️ **BLOQUEADOR: Design #1 — jewelry-v1**
>
> Este sprint **não pode começar** sem o design do template de joias aprovado.
> Antes de iniciar, o stakeholder deve levar o briefing gerado por Claude Code para o Claude Design.
> O desenvolvimento do storefront começa com shadcn padrão e é substituído pelo design entregue.

**Objetivo:** Cliente consegue navegar pela loja, ver produtos e adicionar ao carrinho.

**Entregável tangível:** Storefront com homepage, PLP, PDP e carrinho funcionando com o design jewelry-v1 aplicado.

**Critérios de pronto:**
- [ ] Homepage com hero, coleções em destaque, seções configuráveis
- [ ] PLP com filtros, ordenação, paginação
- [ ] PDP com galeria de imagens/vídeos, variantes, campos do nicho, urgência com dados reais
- [ ] Carrinho com edição, estimativa de frete e resumo
- [ ] Login social (Google) para clientes
- [ ] Área do cliente: histórico de pedidos, endereços
- [ ] Busca simples por texto (semântica fica no Sprint 10)
- [ ] SEO técnico: sitemap.xml automático, canonical tags, Schema.org/produto
- [ ] Core Web Vitals no alvo desde o início
- [ ] Template jewelry-v1 integrado: tokens, tipografia, paleta

**Ponto crítico de arquitetura — como templates plugam:**

```typescript
// packages/engine/src/template-loader.ts
export async function loadTemplate(templateId: string) {
  // Motor não conhece "joias" — só carrega via ID
  const template = await import(`../../../templates/${templateId}/index.ts`);
  return template.default;
}

// apps/storefront/src/app/layout.tsx
const template = await loadTemplate(process.env.TEMPLATE_ID!);
// template.tokens, template.config, template.voiceConfig
```

**Claude Design brief (gerado no final do Sprint 1):**
Entregar ao stakeholder briefing completo com: escopo, seções do doc balisador relevantes, limitações técnicas, lista de componentes esperados e formato de entrega.

---

## Sprint 3 — Checkout + pagamentos BR

**Objetivo:** Cliente consegue pagar e receber confirmação. Lojista vê o pedido.

**Entregável tangível:** Fluxo completo Pix → QR code → confirmação automática → email de pedido confirmado.

**Critérios de pronto:**
- [ ] Checkout em mínimo de etapas (endereço → frete → pagamento → confirmação)
- [ ] Mercado Pago: Pix (QR code + chave), cartão com parcelamento configurável, boleto
- [ ] Webhooks de pagamento com validação de assinatura
- [ ] Trigger.dev: job de sync automático com gateway após criação de produto/preço
- [ ] Email transacional via Resend: confirmação de pedido, Pix gerado, pagamento confirmado
- [ ] Dados de cartão nunca passam pelo servidor (tokenização via SDK MP no browser)
- [ ] Detecção básica de fraude (score por pedido)
- [ ] Cupons de desconto criados no admin → sincronizados no gateway via Trigger.dev
- [ ] Testes E2E do fluxo de checkout com Playwright (ambiente sandbox)

**Bloqueadores externos:**
- Conta Mercado Pago com acesso à API (sandbox + produção)
- Configurar webhook URL no painel do Mercado Pago

**Complexidade:** Alta. Webhooks + retry + idempotência são críticos.

---

## Sprint 4 — Pedidos + frete + fiscal

**Objetivo:** Pedido pago vira NF-e automática e etiqueta de envio.

**Entregável tangível:** Pedido confirmado → NF-e emitida → etiqueta gerada → status "enviado" com código de rastreio.

**Critérios de pronto:**
- [ ] Ciclo de vida completo: pendente → pago → em separação → enviado → entregue → cancelado
- [ ] Melhor Envio: cálculo de frete em tempo real, múltiplas opções com prazo
- [ ] Geração de etiqueta de envio com 1 clique (Correios, Jadlog via Melhor Envio)
- [ ] Integração Bling: NF-e automática ao confirmar pagamento (regra configurável)
- [ ] NF-e disponível no email do cliente, área logada e admin (PDF + XML)
- [ ] Fila de pedidos no admin com filtros e atualização de status
- [ ] Emails automáticos por transição de status
- [ ] Status de saúde do gateway no dashboard (verde/amarelo/vermelho)

**Bloqueadores externos:**
- Conta Bling com acesso à API (CNPJ do lojista)
- Conta Melhor Envio

---

## Sprint 5 — Admin operacional completo

**Objetivo:** Admin está pronto para operação diária sem precisar de suporte externo.

**Entregável tangível:** Dashboard completo + todas as filas operacionais funcionando.

**Critérios de pronto:**
- [ ] Dashboard: receita por período, pedidos recentes, produtos mais vendidos, visitantes, taxa de conversão
- [ ] Fila de moderação de avaliações: preview, aprovar/rejeitar com 1 clique
- [ ] Configurações completas via interface (identidade, gateways, frete, email)
- [ ] Editor de aparência dentro dos limites do template
- [ ] Sistema de papéis (roles): Owner, Admin, Operador, Editor, Atendimento, Financeiro
- [ ] 2FA obrigatório para todos os papéis
- [ ] Logs de auditoria: quem fez o quê e quando
- [ ] Convite de usuário por email com 1 clique
- [ ] Instruções contextuais em todas as telas (fator moleza)

---

## Sprint 6 — CRM + garantias + trocas e devoluções

**Objetivo:** Operação pós-venda estruturada. Zero WhatsApp para resolver troca.

**Entregável tangível:** Cliente abre troca pela área logada → lojista aprova/recusa no admin → etiqueta reversa gerada → reembolso disparado com 1 clique.

**Critérios de pronto:**
- [ ] Perfil completo de cliente: dados, LTV, número de pedidos, segmento RFM, canal de aquisição
- [ ] Garantias por produto/cliente: painel com status, alertas 30 dias antes do vencimento
- [ ] Filtro: clientes com garantia expirando nos próximos 30/60/90 dias
- [ ] Fluxo de trocas/devoluções: solicitação pelo cliente → análise → aprovação → logística reversa → reembolso
- [ ] Validação automática do prazo de troca configurado por produto
- [ ] Estados claros: solicitada → em análise → aprovada → aguardando produto → recebida → finalizada
- [ ] Geração de etiqueta reversa via Melhor Envio
- [ ] Reembolso integrado ao gateway no clique de aprovação
- [ ] Crédito em loja como alternativa ao reembolso (gift card automático)
- [ ] NF-e de devolução emitida automaticamente via Bling

---

## Sprint 7 — IA backoffice v1

**Objetivo:** Lojista gera descrições, SEO e remove fundos sem sair do admin.

**Entregável tangível:** Produto criado → botão "Gerar com IA" → descrição + meta title + meta description preenchidos automaticamente no tom de voz configurado.

**Critérios de pronto:**
- [ ] Geração de descrições via Claude API (tom configurado pelo brand guide do template)
- [ ] SEO automático: meta title e meta description otimizados e editáveis
- [ ] Remoção de fundo via Remove.bg no upload de imagem
- [ ] Brand guide por instância: tom, pessoa, palavras a evitar/preferir, exemplo de copy
- [ ] Cache inteligente: mesma geração para mesmo produto não consome 2x
- [ ] Painel de uso de IA: gerações consumidas no mês
- [ ] Limites configuráveis por instância com alerta antes do teto
- [ ] Modo degradado: se Claude API falhar, exibe campos em branco sem quebrar o admin
- [ ] Testes: mock da Claude API nos testes, sem custo real em CI

**Bloqueadores externos:**
- Chave Claude API (Anthropic)

---

## Sprint 8 — FaqZap + notificações + tickets

**Objetivo:** Lojista não precisa ficar no admin para saber o que está acontecendo.

**Entregável tangível:** Pedido criado → cliente recebe confirmação no WhatsApp com Pix/QR → lojista recebe alerta no seu WhatsApp.

**Critérios de pronto:**
- [ ] Integração FaqZap: todos os eventos da seção 17 do doc balisador
- [ ] Notificações ao lojista: novo pedido, pagamento, estoque baixo, avaliação pendente, solicitação de troca, falha fiscal
- [ ] Canais configuráveis por evento: email, push (PWA), WhatsApp, Slack
- [ ] Resumo diário no horário escolhido pelo lojista
- [ ] Sistema de tickets: caixa com histórico, status, responsável, prioridade
- [ ] Ticket vinculado ao pedido e ao cliente
- [ ] Templates de resposta com variáveis
- [ ] SLA configurável com alerta visual
- [ ] Escalada do bot FaqZap → ticket no admin
- [ ] Recuperação de carrinho abandonado via email + WhatsApp (Trigger.dev: job agendado)

**Bloqueadores externos:**
- Conta FaqZap

---

## Sprint 9 — Estúdio criativo IA

> ⚠️ **BLOQUEADOR: Design #2 — UX do estúdio criativo**
>
> A interface do estúdio é complexa o suficiente para precisar de design dedicado.
> Stakeholder leva briefing para Claude Design antes deste sprint.
> O desenvolvimento começa com interface funcional e é refinado com o design entregue.

**Objetivo:** Foto de celular vira conjunto profissional pronto para loja e anúncios.

**Entregável tangível:** Upload de 1 foto do produto → admin gera 5 composições com cenário, variação de ângulo e lifestyle via IA.

**Critérios de pronto:**
- [ ] Integração com provider de geração de imagem (a definir: Ideogram, Flux via Replicate, DALL-E 3)
- [ ] Composições com cenário configurável pelo template
- [ ] Variações de ângulo
- [ ] Lifestyle com modelo/cenário
- [ ] Troca de fundo
- [ ] Pipeline Trigger.dev: job assíncrono de geração (não bloqueia o admin)
- [ ] Cache: composição já gerada para o mesmo produto é reaproveitada
- [ ] Geração de vídeo: rotação 360° + composição animada (provider a definir)
- [ ] Modo degradado: se provider falhar, admin exibe mensagem clara sem quebrar

**Decisão estratégica necessária antes deste sprint:**
Qual provider de geração de imagem? Trade-off custo vs qualidade vs API reliability. Stakeholder decide.

---

## Sprint 10 — Busca semântica + pixels + SEO avançado

**Objetivo:** Tráfego orgânico e pago funcionando e rastreável.

**Entregável tangível:** Busca por "anel dourado para noivado" retorna produtos relevantes. Compra rastreada no Meta Pixel e GA4.

**Critérios de pronto:**
- [ ] Busca semântica v1: embeddings de produtos + busca por intenção
- [ ] Google Tag Manager: container único injetado pelo motor
- [ ] GA4: funil completo, receita, LTV, origem
- [ ] Meta Pixel: Conversions API server-side + pixel client-side
- [ ] TikTok Pixel
- [ ] Google Ads Conversion Tracking
- [ ] Microsoft Clarity: integração + base para IA de insights
- [ ] Parâmetros UTM preservados até o pedido
- [ ] Schema.org completo: produto, breadcrumb, organização, avaliações
- [ ] Redirects 301 automáticos quando produto é arquivado ou URL muda
- [ ] hreflang preparado (ativado na Fase 2 multi-idioma)
- [ ] Blog/conteúdo nativo: lojista publica guias, IA ajuda na escrita

---

## Sprint 11 — Polimento + segurança + produção

**Objetivo:** Loja pronta para vender de verdade. Zero dívida técnica crítica.

**Entregável tangível:** Auditoria de segurança passando, Core Web Vitals no verde, backup automatizado testado, modo degradado validado.

**Critérios de pronto:**
- [ ] Security audit: CSRF, rate limiting, sanitização de inputs, upload com validação de tipo real
- [ ] LGPD: banner de cookies com consentimento granular, direito de exclusão
- [ ] Core Web Vitals dentro dos limites do Google
- [ ] PWA: instalável no celular, push notifications
- [ ] Acessibilidade WCAG 2.1 AA (básico)
- [ ] CDN Cloudflare: assets com cache longo, imagens via R2
- [ ] Backup automático diário no Neon (retenção 30 dias)
- [ ] Procedimento de restore testado e documentado
- [ ] Modo degradado validado: IA fora, gateway secundário, serviço de email fora
- [ ] Status page pública da loja
- [ ] Testes E2E com Playwright: fluxo completo compra, troca, login
- [ ] Plano de contingência Black Friday documentado

---

## Design checkpoints — quando e o que entregar ao Claude Design

### 🎨 Design #1 — Antes do Sprint 2 (obrigatório para storefront)

**Solicitar:**
- Sistema de design completo jewelry-v1
- Design tokens: paleta, tipografia (3–5 combinações curadas), espaçamentos, sombras, raios
- Layouts: homepage, PLP, PDP, carrinho, checkout, conta do cliente
- Estados: hover, foco, erro, vazio, loading
- Componentes: card de produto, galeria, badge de urgência, avaliações, trust signals
- Formato de entrega: Tailwind tokens + especificações de componentes

**Entregar para Claude Design:**
```
[Claude Code gera este briefing ao fim do Sprint 1, 
com trechos exatos do doc balisador + limitações técnicas + 
lista completa de componentes necessários + formato de entrega]
```

### 🎨 Design #2 — Antes do Sprint 9 (UX do estúdio criativo)

**Solicitar:**
- UX do estúdio de imagem/vídeo no admin
- Fluxo de upload → configurar composição → visualizar resultado → salvar/descartar
- Estados de loading para geração (pode levar 30–60s)
- Painel de uso de IA (cotas, consumo, alertas)
- Componentes: uploader, selector de estilo, grid de resultados, comparador antes/depois

---

## Fase 1.2 — Template café + internacional (após Sprint 11)

Após a loja de joias estável em produção por pelo menos 4 semanas:

| Sprint | Tema | Destaque |
|---|---|---|
| 12 | Template café + internacionalização | i18n, endereço adaptativo, tipografia própria |
| 13 | Pagamentos internacionais + fiscal | Stripe, PayPal, commercial invoice |
| 14 | Plano de assinatura recorrente | Qualquer produto em ciclo recorrente |
| 15 | Marketplaces iniciais | Google Shopping, Meta Catalog, Etsy |
| 16 | Métricas estratégicas avançadas | CAC, LTV, coorte, NPS automático via FaqZap |
| 17 | Afiliados + embaixadores | Painel dedicado, código pessoal, comissão |

---

## Decisões estratégicas pendentes (aguardam stakeholder)

| Sprint | Decisão | Impacto |
|---|---|---|
| 0 | Apple Login no sprint 0 ou depois? | Custo $99/ano Apple Developer, burocracia |
| 3 | Mercado Pago ou Pagar.me como primário? | Taxas, suporte, integração |
| 4 | Bling ou Olist para NF-e? | Custo mensal, API, suporte |
| 9 | Provider de geração de imagem? | Custo/qualidade/API (Ideogram, Flux, DALL-E 3) |

---

## Complexidade por sprint

| Sprint | Complexidade | Justificativa |
|---|---|---|
| 0 | Média | Config intensiva, pouca lógica de negócio |
| 1 | Média | Upload + variantes são as partes densas |
| 2 | Alta | Design externo + template system + SSR |
| 3 | Alta | Webhooks + idempotência + sandbox tests |
| 4 | Média-Alta | 3 integrações externas simultâneas |
| 5 | Média | Admin CRUD + roles |
| 6 | Alta | Fluxo de estados + logística reversa + fiscal |
| 7 | Média | IA relativamente isolada, caching é o desafio |
| 8 | Média | Muitas integrações mas padrão bem definido |
| 9 | Alta | IA assíncrona + jobs longos + UX complexa |
| 10 | Média | Muitos pixels mas padrão repetitivo |
| 11 | Alta | Testes E2E + segurança não têm atalho |
