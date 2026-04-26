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

// ── User roles (admin) ────────────────────────────────────────────────────────
//
// Papéis (v1): owner | admin | operador | editor | atendimento | financeiro
// - owner:       conta única, dono do tenant, todas permissões + billing
// - admin:       todas permissões exceto billing
// - operador:    pedidos + atendimento + leitura geral
// - editor:      produtos + coleções + uploads (sem pedidos/financeiro)
// - atendimento: tickets + chatbot + leitura cliente
// - financeiro:  pedidos + relatórios + cupons + leitura (sem editar produto/cliente)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    email: varchar('email', { length: 300 }).notNull(),
    role: varchar('role', { length: 30 }).notNull(),
    invitedByUserId: uuid('invited_by_user_id'),
    invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_user_roles_tenant_user').on(t.tenantId, t.userId),
    index('idx_user_roles_tenant_email').on(t.tenantId, t.email),
  ],
);

// ── Audit log ─────────────────────────────────────────────────────────────────
//
// Registro append-only de mutações sensíveis (ordem, ticket, settings, ugc, products).
// Action format: '<entity>.<verb>' — e.g. 'order.status_change', 'ticket.assign',
// 'settings.update', 'ugc.approve', 'product.update', 'role.invite'

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'), // null = system / cron
    userEmail: varchar('user_email', { length: 300 }), // snapshot para audit mesmo após user delete
    action: varchar('action', { length: 80 }).notNull(),
    entityType: varchar('entity_type', { length: 60 }),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    metadata: jsonb('metadata').default({}).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_audit_tenant_created').on(t.tenantId, t.createdAt),
    index('idx_audit_tenant_action').on(t.tenantId, t.action),
    index('idx_audit_tenant_entity').on(t.tenantId, t.entityType, t.entityId),
    index('idx_audit_user').on(t.userId),
  ],
);

// ── 2FA TOTP ──────────────────────────────────────────────────────────────────
//
// Per-user TOTP secret + recovery codes. Habilitado por user (não tenant).

export const userTwoFactor = pgTable(
  'user_two_factor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique(),
    // Secret base32 — armazenado como texto (sensível, mas isolado por userId)
    secret: text('secret').notNull(),
    enabled: text('enabled').default('false').notNull(), // 'true' | 'false' (string p/ idempotência)
    recoveryCodesHash: jsonb('recovery_codes_hash').default([]).notNull(),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

// ── User invite tokens (Sprint 5 — convite usuário com URL+token, sem Resend) ─
//
// Token gerado no POST /api/users — lojista compartilha URL manualmente.
// Validade: 7 dias. Aceite automático no signIn quando user.email == invite.email.

export const userInviteTokens = pgTable(
  'user_invite_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 300 }).notNull(),
    role: varchar('role', { length: 30 }).notNull(),
    token: varchar('token', { length: 64 }).notNull().unique(),
    invitedByUserId: uuid('invited_by_user_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: uuid('accepted_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_invite_tokens_tenant_email').on(t.tenantId, t.email),
    index('idx_invite_tokens_token').on(t.token),
  ],
);

export type UserRole = typeof userRoles.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserTwoFactor = typeof userTwoFactor.$inferSelect;
export type UserInviteToken = typeof userInviteTokens.$inferSelect;

// ── Permissões por papel (escopo coarse-grained v1) ───────────────────────────

export const ROLE_PERMISSIONS = {
  owner: {
    products: 'write', orders: 'write', customers: 'write', tickets: 'write',
    ugc: 'write', settings: 'write', billing: 'write', users: 'write',
    insights: 'read', audit: 'read',
  },
  admin: {
    products: 'write', orders: 'write', customers: 'write', tickets: 'write',
    ugc: 'write', settings: 'write', billing: 'none', users: 'write',
    insights: 'read', audit: 'read',
  },
  operador: {
    products: 'read', orders: 'write', customers: 'read', tickets: 'write',
    ugc: 'read', settings: 'none', billing: 'none', users: 'none',
    insights: 'read', audit: 'none',
  },
  editor: {
    products: 'write', orders: 'none', customers: 'none', tickets: 'none',
    ugc: 'write', settings: 'none', billing: 'none', users: 'none',
    insights: 'read', audit: 'none',
  },
  atendimento: {
    products: 'read', orders: 'read', customers: 'read', tickets: 'write',
    ugc: 'read', settings: 'none', billing: 'none', users: 'none',
    insights: 'read', audit: 'none',
  },
  financeiro: {
    products: 'read', orders: 'write', customers: 'read', tickets: 'read',
    ugc: 'read', settings: 'none', billing: 'read', users: 'none',
    insights: 'read', audit: 'read',
  },
} as const;

export type Role = keyof typeof ROLE_PERMISSIONS;
export type Scope = keyof typeof ROLE_PERMISSIONS['owner'];
export type Permission = 'none' | 'read' | 'write';

export function can(role: Role, scope: Scope, action: 'read' | 'write'): boolean {
  const perm = ROLE_PERMISSIONS[role]?.[scope] as Permission | undefined;
  if (!perm || perm === 'none') return false;
  if (action === 'read') return perm === 'read' || perm === 'write';
  return perm === 'write';
}
