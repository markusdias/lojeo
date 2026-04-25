# Decision Log

Decisões técnicas relevantes registradas com data e justificativa.

---

## 2026-04-25 — Stack tecnológica aprovada

**Decisão:** Next.js 15 (App Router) monorepo com pnpm workspaces + Turborepo.

**Alternativa considerada:** Hono API separada + Next.js frontends.

**Justificativa:** Migração EasyPanel→Vercel trivial (zero reescrita). Motor separado como package no monorepo, sem custo operacional de serviço adicional.

---

## 2026-04-25 — Banco de dados: Neon

**Decisão:** Neon (PostgreSQL serverless) como banco principal.

**Alternativa considerada:** Supabase.

**Justificativa:** Não precisamos de Auth/Storage do Supabase (usamos Auth.js + R2). Neon é mais barato na escala, tem branching de banco para CI/CD, e tem integração nativa com Vercel para migração futura.

---

## 2026-04-25 — ORM: Drizzle

**Decisão:** Drizzle ORM.

**Alternativa considerada:** Prisma.

**Justificativa:** Edge-compatible (crítico para Vercel Edge Functions futuro). Bundle menor. Queries tipadas sem overhead. Prisma tem problemas documentados em Edge.

---

## 2026-04-25 — Autenticação: Auth.js v5

**Decisão:** Auth.js v5 (NextAuth).

**Alternativa considerada:** Clerk.

**Justificativa:** Zero vendor lock-in. Dados de sessão no próprio banco. Controle total necessário para a fase SaaS. Clerk é SaaS pago com lock-in.

---

## 2026-04-25 — Jobs assíncronos: Trigger.dev (self-hosted)

**Decisão:** Trigger.dev self-hosted no EasyPanel na Fase 1.

**Alternativa considerada:** BullMQ + Redis local, Inngest.

**Justificativa:** BullMQ/Redis local acopla ao VPS e não funciona no Vercel. Trigger.dev self-hosted é gratuito, open source, tem imagem Docker pronta. Se/quando migrar para Vercel, só troca a URL de conexão — código idêntico.

---

## 2026-04-25 — Storage: Cloudflare R2

**Decisão:** Cloudflare R2 com abstração local para desenvolvimento.

**Alternativa considerada:** Supabase Storage, AWS S3.

**Justificativa:** Egress gratuito (vs S3 que cobra por download). Free tier generoso (10GB/mês). CDN Cloudflare incluso. Compatível com S3 API. Em desenvolvimento: storage local via filesystem, troca para R2 em staging/produção.

---

## 2026-04-25 — Multi-tenant: shared schema com tenant_id

**Decisão:** Schema compartilhado com `tenant_id` em todas as tabelas. Row-Level Security (RLS) no PostgreSQL para isolamento.

**Alternativa considerada:** Schema separado por tenant.

**Justificativa:** Schema por tenant escala mal para SaaS com muitos lojistas (criação dinâmica de schema é complexa). Shared schema com RLS é o padrão da indústria para SaaS de médio porte. Migrations são aplicadas uma vez para todos os tenants.
