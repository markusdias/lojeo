import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './auth';

export const sessionsBehavior = pgTable(
  'behavior_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
    fingerprint: varchar('fingerprint', { length: 128 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    firstSeen: timestamp('first_seen', { withTimezone: true }).defaultNow().notNull(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow().notNull(),
    userAgent: varchar('user_agent', { length: 500 }),
    consent: jsonb('consent').default({}).notNull(),
  },
  (t) => [
    index('idx_bsessions_tenant_anon').on(t.tenantId, t.anonymousId),
    index('idx_bsessions_user').on(t.userId),
  ],
);

export const behaviorEvents = pgTable(
  'behavior_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessionsBehavior.id, { onDelete: 'cascade' }),
    anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_events_tenant_time').on(t.tenantId, t.createdAt),
    index('idx_events_session').on(t.sessionId),
    index('idx_events_type').on(t.tenantId, t.eventType, t.createdAt),
  ],
);

export type BehaviorEvent = typeof behaviorEvents.$inferSelect;
export type NewBehaviorEvent = typeof behaviorEvents.$inferInsert;
