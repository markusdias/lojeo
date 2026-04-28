import { NextResponse } from 'next/server';
import { db, supportTickets } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '../../../../auth';
import { recordAuditLog } from '../../../../lib/roles';
import { guardPermission } from '../../../../lib/permission-guard';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const denied = await guardPermission('tickets', 'read');
  if (denied) return denied;

  const { id } = await params;
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID()), eq(supportTickets.id, id)))
    .limit(1);

  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const denied = await guardPermission('tickets', 'write');
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json() as {
    status?: string;
    priority?: string;
    assignedToUserId?: string | null;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 422 });
    }
    update.status = body.status;
    if (body.status === 'resolved') update.resolvedAt = new Date();
    if (body.status === 'closed') update.closedAt = new Date();
  }

  if (body.priority) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: 'prioridade inválida' }, { status: 422 });
    }
    update.priority = body.priority;
  }

  if ('assignedToUserId' in body) {
    update.assignedToUserId = body.assignedToUserId ?? null;
  }

  const [before] = await db.select().from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID()), eq(supportTickets.id, id))).limit(1);

  await db
    .update(supportTickets)
    .set(update)
    .where(and(eq(supportTickets.tenantId, TENANT_ID()), eq(supportTickets.id, id)));

  await recordAuditLog({
    session,
    action: 'ticket.update',
    entityType: 'ticket',
    entityId: id,
    before: before ? { status: before.status, priority: before.priority, assignedToUserId: before.assignedToUserId } : undefined,
    after: update,
  });

  return NextResponse.json({ ok: true });
}
