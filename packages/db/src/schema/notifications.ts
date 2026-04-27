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

// ── Seller notifications (alertas in-app pro lojista) ─────────────────────────
//
// Notifications dirigidas a usuários do admin (lojista, equipe). Bell header +
// página /notificacoes lista. NÃO é restock_notifications (cliente final).
//
// type formato: '<entity>.<event>' — ex: 'order.created', 'order.paid',
// 'inventory.low_stock', 'review.pending', 'return.requested', 'fiscal.failed',
// 'churn.alert', 'restock.demand', 'ticket.assigned'
//
// userId NULL = broadcast tenant-wide (todos do admin recebem). Senão dirigida.
// readAt NULL = unread.

export const sellerNotifications = pgTable(
  'seller_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    type: varchar('type', { length: 60 }).notNull(),
    severity: varchar('severity', { length: 20 }).default('info').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body'),
    link: varchar('link', { length: 500 }),
    entityType: varchar('entity_type', { length: 60 }),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_seller_notif_tenant_user_created').on(t.tenantId, t.userId, t.createdAt),
    index('idx_seller_notif_tenant_read').on(t.tenantId, t.readAt),
    index('idx_seller_notif_tenant_type').on(t.tenantId, t.type),
  ],
);

export type SellerNotification = typeof sellerNotifications.$inferSelect;
export type NewSellerNotification = typeof sellerNotifications.$inferInsert;

export type NotificationSeverity = 'info' | 'warning' | 'critical';
