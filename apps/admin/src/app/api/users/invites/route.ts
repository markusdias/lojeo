import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db, userInviteTokens } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

// GET /api/users/invites — lista convites pendentes (não aceitos, não expirados)
export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const now = new Date();
  const rows = await db
    .select({
      id: userInviteTokens.id,
      email: userInviteTokens.email,
      role: userInviteTokens.role,
      token: userInviteTokens.token,
      invitedByUserId: userInviteTokens.invitedByUserId,
      expiresAt: userInviteTokens.expiresAt,
      createdAt: userInviteTokens.createdAt,
    })
    .from(userInviteTokens)
    .where(and(
      eq(userInviteTokens.tenantId, TENANT_ID),
      isNull(userInviteTokens.acceptedAt),
      gt(userInviteTokens.expiresAt, now),
    ))
    .orderBy(desc(userInviteTokens.createdAt));

  const invites = rows.map(r => ({
    id: r.id,
    email: r.email,
    role: r.role,
    inviteUrl: `/invite/${r.token}`,
    invitedByUserId: r.invitedByUserId,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ invites });
}

// DELETE /api/users/invites?id=<inviteId> — revoga convite
export async function DELETE(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'users', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [before] = await db.select().from(userInviteTokens)
    .where(and(eq(userInviteTokens.id, id), eq(userInviteTokens.tenantId, TENANT_ID)))
    .limit(1);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db.delete(userInviteTokens).where(eq(userInviteTokens.id, id));

  await recordAuditLog({
    session,
    action: 'role.invite_revoke',
    entityType: 'user_invite_token',
    entityId: id,
    before: { email: before.email, role: before.role },
  });
  return NextResponse.json({ ok: true });
}
