import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db, userRoles, userInviteTokens } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['owner', 'admin', 'operador', 'editor', 'atendimento', 'financeiro'];
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function generateInviteToken(): string {
  return randomBytes(32).toString('hex'); // 64 chars hex
}

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const rows = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.tenantId, TENANT_ID))
    .orderBy(desc(userRoles.createdAt));
  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email inválido' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'role inválido', validRoles: VALID_ROLES }, { status: 400 });
  }

  // Verifica se já existe convite/role para esse email
  const [existing] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.tenantId, TENANT_ID), eq(userRoles.email, email)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(userRoles)
      .set({ role, updatedAt: new Date() })
      .where(eq(userRoles.id, existing.id))
      .returning();

    await recordAuditLog({
      session,
      action: 'role.update',
      entityType: 'user_role',
      entityId: updated?.id ?? null,
      after: { email, role },
    });
    return NextResponse.json(updated);
  }

  // Convite: cria entry sem userId (placeholder pendente do user real fazer login)
  const [created] = await db.insert(userRoles).values({
    tenantId: TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000000', // placeholder até user logar
    email,
    role,
    invitedByUserId: session?.user?.id ?? null,
  }).returning();

  // Gera token de convite (7d) — lojista compartilha URL manualmente (sem Resend)
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await db.insert(userInviteTokens).values({
    tenantId: TENANT_ID,
    email,
    role,
    token,
    invitedByUserId: session?.user?.id ?? null,
    expiresAt,
  });
  const inviteUrl = `/invite/${token}`;

  await recordAuditLog({
    session,
    action: 'role.invite',
    entityType: 'user_role',
    entityId: created?.id ?? null,
    after: { email, role, inviteTokenIssued: true, expiresAt: expiresAt.toISOString() },
  });
  return NextResponse.json({ ...created, inviteUrl }, { status: 201 });
}
