import { db, userRoles, auditLogs, can as canCheck, type Role, type Scope } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

export const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * Default role para usuário admin que ainda não tem entry em user_roles
 * — backwards compat: primeiro user que loga vira owner automaticamente.
 */
export const DEFAULT_ROLE: Role = 'owner';

export interface SessionLike {
  user?: { id?: string | null; email?: string | null; name?: string | null } | null;
}

/**
 * Resolve role atual do usuário logado. Cria entry 'owner' na primeira chamada.
 */
export async function getCurrentRole(session: SessionLike | null | undefined): Promise<Role> {
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return DEFAULT_ROLE; // placeholder até tenant ter user real

  const [existing] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(and(eq(userRoles.tenantId, TENANT_ID), eq(userRoles.userId, userId)))
    .limit(1);

  if (existing) return existing.role as Role;

  // Bootstrap: primeiro user vira owner
  if (email) {
    await db.insert(userRoles).values({
      tenantId: TENANT_ID,
      userId,
      email,
      role: DEFAULT_ROLE,
      acceptedAt: new Date(),
    }).onConflictDoNothing();
  }
  return DEFAULT_ROLE;
}

/**
 * Throws if the current role is not allowed to perform action on scope.
 */
export async function requirePermission(
  session: SessionLike | null | undefined,
  scope: Scope,
  action: 'read' | 'write',
): Promise<Role> {
  const role = await getCurrentRole(session);
  if (!canCheck(role, scope, action)) {
    throw new Error(`forbidden: role '${role}' lacks ${action} on '${scope}'`);
  }
  return role;
}

/**
 * Audit log helper. Falha não derruba o caller (try/catch interno).
 */
export interface AuditInput {
  session?: SessionLike | null;
  action: string; // 'order.status_change', 'ticket.assign', etc.
  entityType?: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: TENANT_ID,
      userId: input.session?.user?.id ?? null,
      userEmail: input.session?.user?.email ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? null : (input.before as object),
      after: input.after === undefined ? null : (input.after as object),
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    // Audit failure must never block business operation
    console.warn('[audit] failed to record:', err instanceof Error ? err.message : err);
  }
}
