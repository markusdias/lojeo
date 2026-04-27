import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { orders } from './orders';

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    // Customer info (userId null = guest)
    userId: uuid('user_id'),
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    customerEmail: varchar('customer_email', { length: 300 }).notNull(),

    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),

    subject: varchar('subject', { length: 300 }).notNull(),
    status: varchar('status', { length: 20 }).default('open').notNull(), // open | in_progress | resolved | closed
    priority: varchar('priority', { length: 20 }).default('medium').notNull(), // low | medium | high | urgent
    source: varchar('source', { length: 20 }).default('web').notNull(), // web | email | whatsapp | bot

    // Assigned admin user (null = unassigned)
    assignedToUserId: uuid('assigned_to_user_id'),

    // SLA
    slaHours: integer('sla_hours').default(24),
    slaDeadlineAt: timestamp('sla_deadline_at', { withTimezone: true }),

    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_tickets_tenant_status').on(t.tenantId, t.status),
    index('idx_tickets_tenant_priority').on(t.tenantId, t.priority),
    index('idx_tickets_user').on(t.userId),
    index('idx_tickets_order').on(t.orderId),
    index('idx_tickets_assigned').on(t.assignedToUserId),
    index('idx_tickets_created').on(t.createdAt),
  ],
);

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),

    // null userId = bot message
    userId: uuid('user_id'),
    senderType: varchar('sender_type', { length: 20 }).notNull(), // customer | admin | bot

    body: text('body').notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_ticket_msgs_ticket').on(t.ticketId),
    index('idx_ticket_msgs_created').on(t.createdAt),
  ],
);

export const ticketTemplates = pgTable(
  'ticket_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_ticket_templates_tenant').on(t.tenantId),
  ],
);

// ── Ticket assignment rules (Sprint 9) ────────────────────────────────────────
//
// Regras configuráveis para auto-atribuição de tickets criados.
// Aplicadas em ordem crescente de `priority` na criação (POST /api/support/tickets);
// primeira regra que casar define o assignedToUserId.
//
// ruleType:
//   'keyword'     → keyword (case-insensitive) presente em subject/body → targetUserId
//   'round_robin' → distribui ciclicamente entre users (metadata.userIds[]).
//                   targetUserId guarda o "último" para próxima rodada.

export const ticketAssignmentRules = pgTable(
  'ticket_assignment_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    ruleType: varchar('rule_type', { length: 30 }).notNull(), // 'keyword' | 'round_robin'
    keyword: varchar('keyword', { length: 200 }),
    targetUserId: uuid('target_user_id'),
    priority: integer('priority').default(100).notNull(),
    active: boolean('active').default(true).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_ticket_rules_tenant_active').on(t.tenantId, t.active),
    index('idx_ticket_rules_priority').on(t.tenantId, t.priority),
  ],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type TicketTemplate = typeof ticketTemplates.$inferSelect;
export type TicketAssignmentRule = typeof ticketAssignmentRules.$inferSelect;
export type NewTicketAssignmentRule = typeof ticketAssignmentRules.$inferInsert;
