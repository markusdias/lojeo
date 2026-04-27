// Affiliate program schema — links afiliados + tracking de clicks/conversions.
//
// Cliente clica em URL com `?ref=CODE` → cookie 30d.
// Quando cliente faz pedido: order.metadata.affiliateRef = CODE
// + cron diario incrementa affiliate_links.conversions / payoutCents.

import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const affiliateLinks = pgTable(
  'affiliate_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),                 // afiliado: pode ser user ou external (parceiro)
    affiliateName: varchar('affiliate_name', { length: 200 }).notNull(),
    affiliateEmail: varchar('affiliate_email', { length: 300 }),
    code: varchar('code', { length: 32 }).notNull(),
    /** % de comissão em basis points (ex: 1000 = 10%). */
    commissionBps: integer('commission_bps').default(1000).notNull(),
    clicks: integer('clicks').default(0).notNull(),
    conversions: integer('conversions').default(0).notNull(),
    /** Cents totais já pagos ao afiliado. */
    payoutCents: integer('payout_cents').default(0).notNull(),
    /** Cents acumulados pendentes de payout. */
    pendingCents: integer('pending_cents').default(0).notNull(),
    active: boolean('active').default(true).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_affiliates_tenant_code').on(t.tenantId, t.code),
    index('idx_affiliates_tenant_active').on(t.tenantId, t.active),
    index('idx_affiliates_user').on(t.userId),
  ],
);

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type NewAffiliateLink = typeof affiliateLinks.$inferInsert;
