# ADR 0001 — Monorepo pnpm workspaces + Turborepo

**Status:** aceito · **Data:** 2026-04-26

## Contexto

Sprint 0 exigiu motor + admin + storefront + packages compartilhados (db, ai, tracking, storage, ui, engine, email, logger, config). Multi-tenant desde o dia 1 e templates plugáveis sem que o motor conheça nichos específicos.

## Decisão

Monorepo único com:
- **pnpm workspaces** para gerenciar dependências e symlinking entre packages
- **Turborepo** para orquestrar build/lint/typecheck/test em DAG com cache local
- **`@lojeo/config`** como package central de tsconfig e ESLint flat config
- **`workspace:*`** em todas as deps internas para versionamento atômico

## Consequências

- + Refactors atômicos (renomear API entre admin e package db = 1 commit)
- + Cache do Turbo dramaticamente reduz tempo de CI/dev
- + Migração futura para Vercel/Nx sem reescrita
- − Lockfile gigante; pnpm mitiga via store global
- − Dev novo precisa entender DAG do Turbo (mas docs cobrem)

## Alternativas rejeitadas

- **Nx:** mais opinativo e pesado. Turborepo basta para 13 packages.
- **Repos separados (polyrepo):** versionamento entre admin↔db vira pesadelo na Fase 2 SaaS.
- **Lerna:** legacy/morto; sem manutenção ativa.
