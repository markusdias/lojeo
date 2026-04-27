import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const aiCache = pgTable(
  'ai_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheKey: varchar('cache_key', { length: 128 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
    response: jsonb('response').notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    costUsdMicro: integer('cost_usd_micro').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('idx_ai_cache_key').on(t.cacheKey),
    index('idx_ai_cache_model_time').on(t.model, t.createdAt),
  ],
);

export const aiCalls = pgTable(
  'ai_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    feature: varchar('feature', { length: 64 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    cached: integer('cached').default(0).notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    costUsdMicro: integer('cost_usd_micro').default(0).notNull(),
    durationMs: integer('duration_ms').default(0).notNull(),
    error: text('error'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_ai_calls_tenant_time').on(t.tenantId, t.createdAt),
    index('idx_ai_calls_feature').on(t.feature, t.createdAt),
  ],
);

// ── IA Analyst — cache server-side por tenant + hash da query (Sprint 8 v2) ──
//
// Estratégia: lookup ANTES de chamar Claude. TTL 24h server-side. Invariante:
// query é normalizada (lowercase, trim, whitespace colapsado, pontuação final
// removida) e o hash é SHA-256(tenantId + ':' + normalized) — colisão entre
// tenants impossível. Cache HIT incrementa hitCount, retorna response/toolCalls
// já materializados sem custo de tokens.
export const aiAnalystCache = pgTable(
  'ai_analyst_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    queryHash: varchar('query_hash', { length: 64 }).notNull(),
    queryNormalized: text('query_normalized').notNull(),
    response: jsonb('response').notNull(),
    toolCalls: jsonb('tool_calls').default([]).notNull(),
    model: varchar('model', { length: 40 }).notNull(),
    tokensIn: integer('tokens_in').default(0).notNull(),
    tokensOut: integer('tokens_out').default(0).notNull(),
    costUsdMicro: integer('cost_usd_micro').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    hitCount: integer('hit_count').default(0).notNull(),
  },
  (t) => [
    uniqueIndex('uniq_ai_analyst_cache_tenant_hash').on(t.tenantId, t.queryHash),
    index('idx_ai_analyst_cache_created').on(t.createdAt),
  ],
);

export type AiAnalystCacheEntry = typeof aiAnalystCache.$inferSelect;
export type NewAiAnalystCacheEntry = typeof aiAnalystCache.$inferInsert;
