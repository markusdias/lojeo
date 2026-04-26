import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const ugcPosts = pgTable(
  'ugc_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    userId: uuid('user_id'), // null = guest
    customerEmail: varchar('customer_email', { length: 300 }),
    customerName: varchar('customer_name', { length: 200 }),

    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    caption: text('caption'),

    // moderating | pending | approved | rejected
    status: varchar('status', { length: 20 }).default('pending').notNull(),

    // direct_upload | social_import | imported_review
    source: varchar('source', { length: 30 }).default('direct_upload').notNull(),
    sourceUrl: text('source_url'), // IG/TikTok original quando social_import

    // [{ productId, x: 0..1, y: 0..1, label? }]
    productsTagged: jsonb('products_tagged').default([]).notNull(),

    // { decision, score, reasons[], extracted_features{} } — null se moderado manual
    aiModerationResult: jsonb('ai_moderation_result'),

    moderatedByUserId: uuid('moderated_by_user_id'),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_ugc_tenant_status').on(t.tenantId, t.status),
    index('idx_ugc_tenant_approved').on(t.tenantId, t.approvedAt),
    index('idx_ugc_user').on(t.userId),
  ],
);

export type UgcPost = typeof ugcPosts.$inferSelect;
