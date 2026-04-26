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

Doc balisador completo: `ecommerce-requisitos-v1.3.md`. Roadmap: `docs/superpowers/plans/2026-04-25-roadmap-fase1.md`.
