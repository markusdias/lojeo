import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, userRoles } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['owner', 'admin', 'operador', 'editor', 'atendimento', 'financeiro'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { role?: string };
  const role = body.role;

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'role inválido' }, { status: 400 });
  }

  const [before] = await db.select().from(userRoles)
    .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, TENANT_ID))).limit(1);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Não permitir downgrade do último owner
  if (before.role === 'owner' && role !== 'owner') {
    const owners = await db.select().from(userRoles)
      .where(and(eq(userRoles.tenantId, TENANT_ID), eq(userRoles.role, 'owner')));
    if (owners.length <= 1) {
      return NextResponse.json({ error: 'tenant_must_have_owner' }, { status: 400 });
    }
  }

  const [updated] = await db.update(userRoles)
    .set({ role, updatedAt: new Date() })
    .where(eq(userRoles.id, id))
    .returning();

  await recordAuditLog({
    session,
    action: 'role.update',
    entityType: 'user_role',
    entityId: id,
    before: { role: before.role },
    after: { role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;

  const [before] = await db.select().from(userRoles)
    .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, TENANT_ID))).limit(1);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (before.role === 'owner') {
    const owners = await db.select().from(userRoles)
      .where(and(eq(userRoles.tenantId, TENANT_ID), eq(userRoles.role, 'owner')));
    if (owners.length <= 1) {
      return NextResponse.json({ error: 'tenant_must_have_owner' }, { status: 400 });
    }
  }

  await db.delete(userRoles).where(eq(userRoles.id, id));

  await recordAuditLog({
    session,
    action: 'role.remove',
    entityType: 'user_role',
    entityId: id,
    before: { email: before.email, role: before.role },
  });

  return NextResponse.json({ ok: true });
}
