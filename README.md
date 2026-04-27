# Lojeo

Motor único de e-commerce adaptável via templates. Fase 1: duas lojas próprias (joias BR + café internacional) como laboratório. Fase 2: SaaS multi-tenant.

## Setup local

```bash
# Pré-requisitos: Node 20.18+, pnpm 9.15+, Docker
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

Variáveis: copiar `.env.example` para `.env` na raiz e preencher conforme necessário (dev funciona sem chaves externas — providers caem em modo mock).

## Rodar dev

```bash
# Admin em http://localhost:3001
pnpm --filter @lojeo/admin dev

# Storefront em http://localhost:3000
pnpm --filter @lojeo/storefront dev
```

## Testes

```bash
pnpm test         # unit + integration
pnpm typecheck    # tsc --noEmit em todos workspaces
pnpm lint         # eslint
```

## Estrutura

```
apps/
├── admin/           Painel administrativo (Next.js 15 + Auth.js v5)
└── storefront/      Loja pública (Next.js 15 + template loader)

packages/
├── engine/          Motor (template-loader, tenant context, pricing) — sem nicho
├── db/              Drizzle ORM + schema multi-tenant + migrations
├── ai/              Wrapper Claude obrigatório (cache + cost tracking)
├── tracking/        SDK behavior events (LGPD-aware)
├── storage/         R2 + local adapter
├── email/           Resend + React Email
├── ui/              shadcn/ui primitives + Tailwind v4
├── logger/          pino estruturado
└── config/          tsconfig + ESLint compartilhados

templates/
├── jewelry-v1/      Joias premium BR (3 combos tipográficos curados)
└── coffee-v1/       Café internacional (Fase 1.2)
```

## Princípios não-negociáveis

- Multi-tenant desde o dia 1 (`tenant_id` em toda entidade de domínio)
- API-first (storefront e admin consomem mesma API)
- Templates plugáveis de verdade (motor não importa de `templates/`)
- Modo degradado (IA/gateway/serviço externo cai → loja continua vendendo)
- Toda IA com cache + cost tracking + research-first protocol em `docs/research/`

## Integrações conectáveis (admin /integracoes)

Cada provedor pode ser conectado de duas formas — UI 1-clique (`tenants.config.integrations.<provider>`) ou variável de ambiente (mais segura, recomendado prod).

| Categoria | Provider | Env vars | Status sem config |
|-----------|----------|----------|-------------------|
| Pagamentos | Mercado Pago | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` | Modo simulado (preference mock, lojista marca paid manual) |
| Pagamentos | Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | — |
| Pagamentos | Pagar.me | `PAGARME_API_KEY` | — |
| Fiscal | Bling NF-e | `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` | NF-e mock (44 dígitos fake) — emite manual no Bling |
| Fiscal | Olist Tiny | `OLIST_API_TOKEN` | — |
| Frete | Melhor Envio | `MELHOR_ENVIO_TOKEN` | Frete manual |
| Email | Resend | `RESEND_API_KEY` | Emails desativados (lojista vê em /pedidos) |
| Email | SendGrid | `SENDGRID_API_KEY` | — |
| WhatsApp | FaqZap | `FAQZAP_API_TOKEN` | Chatbot responde mas não escala humano |
| IA | Anthropic Claude | `ANTHROPIC_API_KEY` | Modo degradado em todas features de IA |
| Jobs | Trigger.dev | `TRIGGER_API_URL`, `TRIGGER_API_KEY` | Jobs síncronos |

## Cron jobs (background tasks)

Endpoints `POST /api/cron/<task>` aceitam dois modos de auth:
1. Sessão NextAuth (lojista clica botão na UI)
2. Header `x-cron-secret: $CRON_SECRET` (scheduler externo)

Configurar `CRON_SECRET` em variáveis EasyPanel:
```bash
openssl rand -hex 32 # gera valor seguro
```

Endpoints disponíveis:
- `POST /api/cron/low-stock-check` — detecta estoque baixo + emit `inventory.low_stock`. Dedup 24h.
- `POST /api/cron/churn-check` — top 5 clientes em risco crítico/alto + emit `churn.alert`. Dedup 7d.

Exemplo cronjob EasyPanel (hourly):
```bash
curl -fsS -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  https://apps-lojeo-admin.m9axtw.easypanel.host/api/cron/low-stock-check
```

## Notificações lojista

9 hooks ativos emitem para `/notificacoes` (bell topbar + página dedicada):
- `order.created`, `order.paid`, `review.pending`, `return.requested`
- `inventory.low_stock`, `restock.demand`, `fiscal.failed`, `churn.alert`, `ticket.assigned`

Opt-out granular por tipo em `/notificacoes/preferencias`.

Doc balisador completo: `ecommerce-requisitos-v1.3.md`. Roadmap: `docs/superpowers/plans/2026-04-25-roadmap-fase1.md`.
