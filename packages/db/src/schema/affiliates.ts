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
    /** Soft-archive: oculta da lista principal sem perder histórico. Status efetivo: archived → active=false → active=true. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    /** Cookie attribution window por afiliado (default 30, suportado 7..120). */
    cookieDays: integer('cookie_days').default(30).notNull(),
    /** Cap de conversões; null = ilimitado. */
    maxUses: integer('max_uses'),
    /** Data limite após qual o link para de creditar (null = sem expiração). */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Categoria livre: influencer / ambassador / partner / vip / staff / outro. */
    tag: varchar('tag', { length: 40 }),
    lastClickAt: timestamp('last_click_at', { withTimezone: true }),
    lastConversionAt: timestamp('last_conversion_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_affiliates_tenant_code').on(t.tenantId, t.code),
    index('idx_affiliates_tenant_active').on(t.tenantId, t.active),
    index('idx_affiliates_user').on(t.userId),
    index('idx_affiliates_tenant_archived').on(t.tenantId, t.archivedAt),
    index('idx_affiliates_tenant_tag').on(t.tenantId, t.tag),
  ],
);

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type NewAffiliateLink = typeof affiliateLinks.$inferInsert;
