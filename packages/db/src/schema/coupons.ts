import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Coupons (descontos aplicáveis no checkout) ───────────────────────────────
//
// type:
//   'percent'        → value = 0..100 (percentual sobre subtotal)
//   'fixed'          → value = cents (desconto fixo em centavos)
//   'free_shipping'  → zera o frete; value ignorado (manter 0)
//
// minOrderCents: subtotal mínimo (em cents) para aplicar o cupom (0 = sem mínimo)
// maxUses: null = ilimitado; quando preenchido, usesCount não pode atingir
// usesCount: incrementado a cada pedido finalizado que usar o cupom (não mexer via PATCH)
// active: soft-delete via false (preserva histórico de orders.coupon_code)
// stackable: false (default) = cupom EXCLUSIVO — não combina com gift card, afiliado ou outro
//            cupom. Default false é segurança anti-prejuízo (margem dupla).
// linkedAffiliateId: cupom amarrado a um afiliado (Modelo 1 — Shopify Collabs / Refersion).
//   Quando preenchido, código digitado pelo cliente atribui venda automaticamente
//   ao afiliado (override de cookie). Ex: cupom MARIA10 → afiliado Maria sempre
//   ganha comissão quando alguém usa. Não conta dupla atribuição.

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 60 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    value: integer('value').notNull(),
    minOrderCents: integer('min_order_cents').default(0).notNull(),
    maxUses: integer('max_uses'),
    usesCount: integer('uses_count').default(0).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    active: boolean('active').default(true).notNull(),
    stackable: boolean('stackable').default(false).notNull(),
    linkedAffiliateId: uuid('linked_affiliate_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_coupons_tenant_code').on(t.tenantId, t.code),
    index('idx_coupons_tenant_active').on(t.tenantId, t.active),
  ],
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;

export type CouponType = 'percent' | 'fixed' | 'free_shipping';

export const COUPON_TYPES: readonly CouponType[] = ['percent', 'fixed', 'free_shipping'] as const;

/**
 * Calcula o desconto em cents a aplicar dado o subtotal.
 * Não considera frete — chamadores que fazem free_shipping devem zerar shippingCents
 * separadamente. Para 'free_shipping' este helper retorna 0 (o desconto vive no frete).
 */
export function calcCouponDiscountCents(
  type: string,
  value: number,
  subtotalCents: number,
): number {
  if (subtotalCents <= 0) return 0;
  if (type === 'percent') {
    const pct = Math.max(0, Math.min(100, value));
    return Math.floor((subtotalCents * pct) / 100);
  }
  if (type === 'fixed') {
    return Math.max(0, Math.min(subtotalCents, value));
  }
  return 0;
}
