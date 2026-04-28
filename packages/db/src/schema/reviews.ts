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
import { products } from './products';

export const productReviews = pgTable(
  'product_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id'),
    userId: uuid('user_id'),
    anonymousName: varchar('anonymous_name', { length: 100 }),
    anonymousEmail: varchar('anonymous_email', { length: 300 }),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 200 }),
    body: text('body'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    adminResponse: text('admin_response'),
    verifiedPurchase: boolean('verified_purchase').default(false).notNull(),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_reviews_product').on(t.productId),
    index('idx_reviews_tenant_status').on(t.tenantId, t.status),
    index('idx_reviews_user').on(t.userId),
  ],
);

export type ProductReview = typeof productReviews.$inferSelect;
