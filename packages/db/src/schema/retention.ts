import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_giftcard_code').on(t.code),
    index('idx_giftcard_tenant').on(t.tenantId),
  ],
);

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type RestockNotification = typeof restockNotifications.$inferSelect;
export type GiftCard = typeof giftCards.$inferSelect;
