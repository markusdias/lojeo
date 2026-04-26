# ADR 0003 — Multi-tenant: shared schema + tenant_id

**Status:** aceito · **Data:** 2026-04-26

## Contexto

Fase 1 = 2 lojas próprias (joias + café). Fase 2 = SaaS multi-tenant com dezenas/centenas de lojistas. CLAUDE.md exige multi-tenant desde o dia 1.

## Decisão

- **Schema compartilhado** — todas as tabelas de domínio têm coluna `tenant_id uuid not null references tenants(id) on delete cascade`
- Indexes compostos `(tenant_id, ...)` em consultas frequentes
- Slugs/SKUs únicos por tenant via `uniqueIndex('idx_x_tenant_slug').on(t.tenantId, t.slug)`
- **Row-Level Security (RLS)** entrará em sprint dedicado quando admin SaaS expor multi-tenant real (Fase 2). Por ora, isolamento garantido pelo middleware/route handlers que injetam `tenant_id` derivado de `x-tenant-id` header ou `process.env.TENANT_ID`

Tabelas Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`) ficam fora do escopo tenant_id pois são compartilhadas entre admin Lojeo (operadores) e clientes finais. `users.tenant_id` é nullable e indica vínculo opcional.

## Consequências

- + Migrations únicas para todos tenants — sem orquestração de schemas
- + Backups e analytics centralizados
- + RLS no Postgres dá isolamento sem reescrita futura
- − Risco de query escapando filtro de tenant — mitigação: helper `withTenant(tx, id)` no Sprint 1 + RLS no Sprint 5

## Alternativas rejeitadas

- **Schema por tenant:** complexo escalar para SaaS, migrations N×, gerenciamento de permissões caro
- **Banco por tenant:** custo proibitivo no plano Neon serverless
