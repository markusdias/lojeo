import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, experiments } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'active', 'paused', 'completed'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?: string; name?: string; description?: string;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    }
    update.status = body.status;
    if (body.status === 'active') update.startedAt = new Date();
    if (body.status === 'completed') update.endedAt = new Date();
  }
  if (body.name) update.name = body.name.trim();
  if ('description' in body) update.description = body.description?.trim() || null;

  const [before] = await db.select().from(experiments)
    .where(and(eq(experiments.id, id), eq(experiments.tenantId, TENANT_ID))).limit(1);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [updated] = await db.update(experiments)
    .set(update)
    .where(eq(experiments.id, id))
    .returning();

  await recordAuditLog({
    session,
    action: body.status ? 'experiment.status_change' : 'experiment.update',
    entityType: 'experiment',
    entityId: id,
    before: { status: before.status, name: before.name },
    after: update,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;
  const [deleted] = await db.delete(experiments)
    .where(and(eq(experiments.id, id), eq(experiments.tenantId, TENANT_ID)))
    .returning();
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await recordAuditLog({
    session,
    action: 'experiment.delete',
    entityType: 'experiment',
    entityId: id,
    before: { key: deleted.key, name: deleted.name },
  });

  return NextResponse.json({ ok: true });
}
