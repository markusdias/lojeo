import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Competitive monitoring (Sprint 8) ─────────────────────────────────────────
//
// Lojista cadastra URL de produto concorrente; sistema scrapeia preço/estoque
// periodicamente e mantém histórico para visualizar tendência (sparkline 30d) e
// gap percentual contra preço próprio (quando ourProductId está presente).
//
// Modo degradado: scrape pode falhar — guardamos último valor conhecido em
// lastPriceCents/lastInStock e seguimos servindo sparkline/cards do que existe.

export const competitorProducts = pgTable(
  'competitor_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    productUrl: text('product_url').notNull(),
    // Produto próprio espelhado (opcional). Sem FK pra não acoplar — se o produto
    // for removido, o competitor permanece e o gap deixa de ser calculado.
    ourProductId: uuid('our_product_id'),
    lastPriceCents: integer('last_price_cents'),
    lastInStock: boolean('last_in_stock'),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_competitors_tenant').on(t.tenantId),
    index('idx_competitors_tenant_our_product').on(t.tenantId, t.ourProductId),
  ],
);

export const competitorPriceHistory = pgTable(
  'competitor_price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    competitorProductId: uuid('competitor_product_id').notNull(),
    priceCents: integer('price_cents').notNull(),
    inStock: boolean('in_stock').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_competitor_history_competitor_captured').on(t.competitorProductId, t.capturedAt),
    index('idx_competitor_history_tenant').on(t.tenantId),
  ],
);

export type CompetitorProduct = typeof competitorProducts.$inferSelect;
export type NewCompetitorProduct = typeof competitorProducts.$inferInsert;
export type CompetitorPriceHistory = typeof competitorPriceHistory.$inferSelect;
export type NewCompetitorPriceHistory = typeof competitorPriceHistory.$inferInsert;
