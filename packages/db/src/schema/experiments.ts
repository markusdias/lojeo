import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Experiments (A/B testing nativo) ──────────────────────────────────────────
//
// Status: draft | active | paused | completed
// targetMetric: 'conversion' (compra) | 'click' (CTA) | 'pageview' | custom event_type
// audience: jsonb com filtros opcionais (logged_in, segment, country, etc.)
// variants: jsonb [{ key: 'a', name: 'Controle', weight: 50, payload: {...} }, ...]
//   weights em percentual (0..100), soma = 100

export const experiments = pgTable(
  'experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 80 }).notNull(), // identificador único legível, e.g. 'hero-headline-2026q2'
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    targetMetric: varchar('target_metric', { length: 60 }).default('conversion').notNull(),
    variants: jsonb('variants').default([]).notNull(),
    audience: jsonb('audience').default({}).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_experiments_tenant_key').on(t.tenantId, t.key),
    index('idx_experiments_tenant_status').on(t.tenantId, t.status),
  ],
);

// Assignment determinístico por anonymousId — mesma sessão sempre cai na mesma variante
export const experimentAssignments = pgTable(
  'experiment_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    experimentId: uuid('experiment_id').notNull().references(() => experiments.id, { onDelete: 'cascade' }),
    anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
    userId: uuid('user_id'),
    variantKey: varchar('variant_key', { length: 40 }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_assignment_anon_experiment').on(t.experimentId, t.anonymousId),
    index('idx_assignment_tenant_experiment').on(t.tenantId, t.experimentId),
    index('idx_assignment_user').on(t.userId),
  ],
);

// Eventos: exposure (viu) + conversion (converteu) + custom
export const experimentEvents = pgTable(
  'experiment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    experimentId: uuid('experiment_id').notNull().references(() => experiments.id, { onDelete: 'cascade' }),
    variantKey: varchar('variant_key', { length: 40 }).notNull(),
    anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
    userId: uuid('user_id'),
    eventType: varchar('event_type', { length: 40 }).notNull(), // exposure | conversion | <custom>
    value: integer('value').default(0), // cents para conversões monetárias, contagem para outros
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_exp_events_tenant_experiment').on(t.tenantId, t.experimentId),
    index('idx_exp_events_experiment_variant').on(t.experimentId, t.variantKey),
    index('idx_exp_events_type').on(t.experimentId, t.eventType),
  ],
);

export type Experiment = typeof experiments.$inferSelect;
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;
export type ExperimentEvent = typeof experimentEvents.$inferSelect;

// ── Variant selection — pure helper (deterministic hash) ──────────────────────

export interface Variant {
  key: string;
  name: string;
  weight: number; // 0..100
  payload?: Record<string, unknown>;
}

/**
 * Determinística: mesmo anonymousId + experimentKey sempre cai na mesma variante.
 * Hash FNV-1a 32-bit (rápido, sem deps externas).
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

export function selectVariant(experimentKey: string, anonymousId: string, variants: Variant[]): Variant | null {
  if (variants.length === 0) return null;
  const totalWeight = variants.reduce((s, v) => s + (v.weight ?? 0), 0);
  if (totalWeight <= 0) return null;
  const hash = fnv1a(`${experimentKey}:${anonymousId}`);
  const bucket = (hash % 10_000) / 100; // 0..100
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += (variant.weight / totalWeight) * 100;
    if (bucket < cumulative) return variant;
  }
  return variants[variants.length - 1] ?? null;
}
