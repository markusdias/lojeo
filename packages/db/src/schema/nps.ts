// NPS responses — survey post-delivery (D+7) ou after support ticket close.
// Score 0-10 + comment opcional + trigger (delivery/ticket_close/manual).

import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const npsResponses = pgTable(
  'nps_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    customerEmail: varchar('customer_email', { length: 300 }),
    score: integer('score').notNull(),                    // 0-10
    comment: text('comment'),
    /** Origem: 'delivery_d7' | 'ticket_close' | 'manual' | 'web_widget' */
    surveyTrigger: varchar('survey_trigger', { length: 32 }).default('manual').notNull(),
    /** Order ou ticket relacionado, opcional. */
    relatedOrderId: uuid('related_order_id'),
    relatedTicketId: uuid('related_ticket_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_nps_tenant_created').on(t.tenantId, t.createdAt),
    index('idx_nps_tenant_score').on(t.tenantId, t.score),
    index('idx_nps_user').on(t.userId),
  ],
);

export type NpsResponse = typeof npsResponses.$inferSelect;
export type NewNpsResponse = typeof npsResponses.$inferInsert;
