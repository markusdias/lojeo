import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Scheduled reports (Sprint 12 — Sec 13.2 stub) ─────────────────────────────
//
// Cada lojista define relatórios programados (revenue summary, conversion funnel,
// inventory low) com cron schedule e destinos (emails). Envio real depende de
// Resend API key configurada — sem chave o cron gera mas não envia.
//
// reportType v1: 'revenue_summary' | 'conversion_funnel' | 'inventory_low'
// destinations: { emails: string[]; channels?: string[] }
// filters: livre por tipo (ex: { stockThreshold: 5 } para inventory_low)

export const scheduledReports = pgTable(
  'scheduled_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    reportType: varchar('report_type', { length: 40 }).notNull(),
    cronExpression: varchar('cron_expression', { length: 40 }).notNull(),
    destinations: jsonb('destinations').default({ emails: [] }).notNull(),
    filters: jsonb('filters').default({}).notNull(),
    active: boolean('active').default(true).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_scheduled_reports_tenant_active').on(t.tenantId, t.active),
    index('idx_scheduled_reports_next_run').on(t.nextRunAt),
  ],
);

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;

// ── Push subscriptions (Sprint 13 — PWA Web Push stub) ────────────────────────
//
// Armazena subscriptions registradas por usuário/anônimo via PushManager.subscribe.
// Sem provider real (FCM/web-push) o servidor não envia — apenas persiste e loga
// o endpoint mock para validação do fluxo.
//
// endpoint é único globalmente (chave do client), evitando duplicatas no resub.

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    endpoint: text('endpoint').notNull().unique(),
    keysP256dh: text('keys_p256dh').notNull(),
    keysAuth: text('keys_auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_push_subs_tenant_user').on(t.tenantId, t.userId),
  ],
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
