import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products, productVariants } from './products';

// ── Wishlist ──────────────────────────────────────────────────────────────────
// userId null = anonymous wishlist (synced on login)

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    anonymousId: varchar('anonymous_id', { length: 64 }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_wishlist_user').on(t.userId),
    index('idx_wishlist_anon').on(t.anonymousId),
    index('idx_wishlist_product').on(t.productId),
  ],
);

// ── Back-in-stock notifications ───────────────────────────────────────────────

export const restockNotifications = pgTable(
  'restock_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    email: varchar('email', { length: 300 }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_restock_variant').on(t.variantId),
    index('idx_restock_product').on(t.productId),
  ],
);

// ── Gift cards ────────────────────────────────────────────────────────────────

export const giftCards = pgTable(
  'gift_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    initialValueCents: integer('initial_value_cents').notNull(),
    currentBalanceCents: integer('current_balance_cents').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    buyerUserId: uuid('buyer_user_id'),
    recipientEmail: varchar('recipient_email', { length: 300 }),
    senderName: varchar('sender_name', { length: 200 }),
    recipientName: varchar('recipient_name', { length: 200 }),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_giftcard_code').on(t.code),
    index('idx_giftcard_tenant').on(t.tenantId),
  ],
);

// ── Recently viewed (sync localStorage → DB ao login) ────────────────────────
export const recentlyViewedItems = pgTable(
  'recently_viewed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_recently_viewed_user_viewed').on(t.userId, t.viewedAt),
    index('idx_recently_viewed_tenant_user').on(t.tenantId, t.userId),
  ],
);

// ── Abandoned carts (recuperação de receita) ─────────────────────────────────
// Cron `/api/cron/abandoned-cart-check` agrega behaviorEvents `cart_add` sem
// `checkout_complete` subsequente em > 1h, persiste snapshot do carrinho aqui
// e dispara email RecoverCart + WhatsApp stub. Dedup 24h via `lastNotifiedAt`.

export const abandonedCarts = pgTable(
  'abandoned_carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id'),
    anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
    userId: uuid('user_id'),
    contactEmail: varchar('contact_email', { length: 300 }),
    contactPhone: varchar('contact_phone', { length: 30 }),
    items: jsonb('items').default([]).notNull(),
    subtotalCents: integer('subtotal_cents').default(0).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    recoveredOrderId: uuid('recovered_order_id'),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }).notNull(),
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
    notifyChannelsTried: jsonb('notify_channels_tried').default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_abandoned_carts_tenant_status').on(t.tenantId, t.status),
    index('idx_abandoned_carts_tenant_event').on(t.tenantId, t.lastEventAt),
    index('idx_abandoned_carts_anon').on(t.anonymousId),
    index('idx_abandoned_carts_user').on(t.userId),
  ],
);

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type RestockNotification = typeof restockNotifications.$inferSelect;
export type GiftCard = typeof giftCards.$inferSelect;
export type RecentlyViewedItem = typeof recentlyViewedItems.$inferSelect;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type NewAbandonedCart = typeof abandonedCarts.$inferInsert;
export interface AbandonedCartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  qty: number;
  priceCents: number;
  imageUrl?: string | null;
}
