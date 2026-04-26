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

export const chatbotSessions = pgTable(
  'chatbot_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    sessionKey: varchar('session_key', { length: 200 }).notNull(),

    productContextId: uuid('product_context_id'),
    productContextName: varchar('product_context_name', { length: 300 }),

    msgCount: integer('msg_count').default(0).notNull(),
    toolCallCount: integer('tool_call_count').default(0).notNull(),
    totalTokensIn: integer('total_tokens_in').default(0).notNull(),
    totalTokensOut: integer('total_tokens_out').default(0).notNull(),

    resolved: boolean('resolved').default(false).notNull(),
    escalated: boolean('escalated').default(false).notNull(),
    escalatedReason: text('escalated_reason'),

    topics: jsonb('topics').default([]).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_chatbot_sessions_tenant_created').on(t.tenantId, t.createdAt),
    index('idx_chatbot_sessions_tenant_resolved').on(t.tenantId, t.resolved),
    index('idx_chatbot_sessions_tenant_escalated').on(t.tenantId, t.escalated),
    index('idx_chatbot_sessions_session_key').on(t.tenantId, t.sessionKey),
  ],
);

export type ChatbotSession = typeof chatbotSessions.$inferSelect;
