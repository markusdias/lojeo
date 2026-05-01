import { pgTable, uuid, varchar, timestamp, text, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantOauthTokens = pgTable(
  'tenant_oauth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 }).notNull(),
    accountEmail: varchar('account_email', { length: 320 }),
    accountId: varchar('account_id', { length: 128 }),
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    scopes: jsonb('scopes').default([]).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantProviderUniq: uniqueIndex('tenant_oauth_tokens_tenant_provider_uniq').on(t.tenantId, t.provider),
  }),
);

export type TenantOauthToken = typeof tenantOauthTokens.$inferSelect;
export type NewTenantOauthToken = typeof tenantOauthTokens.$inferInsert;
