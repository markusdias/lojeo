import { NextResponse } from 'next/server';
import { db, orders, orderEvents } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '../../../../auth';
import { recordAuditLog, requirePermission } from '../../../../lib/roles';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const TRANSITIONS: Record<string, string[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const tid = tenantId();

  const body = await req.json() as { status?: string; notes?: string; trackingCode?: string };
  const newStatus = body.status;
  if (!newStatus) {
    return NextResponse.json({ error: 'status obrigatório' }, { status: 400 });
  }

  const order = await db.query.orders?.findFirst({
    where: and(eq(orders.tenantId, tid), eq(orders.id, id)),
  });
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

  const allowed = TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Transição ${order.status} → ${newStatus} não permitida` },
      { status: 422 },
    );
  }

  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === 'shipped' && body.trackingCode) {
    updateData.trackingCode = body.trackingCode;
    updateData.shippedAt = new Date();
  }
  if (newStatus === 'delivered') {
    updateData.deliveredAt = new Date();
  }

  await db.update(orders).set(updateData).where(and(eq(orders.tenantId, tid), eq(orders.id, id)));

  await db.insert(orderEvents).values({
    orderId: id,
    tenantId: tid,
    eventType: 'status_changed',
    fromStatus: order.status,
    toStatus: newStatus,
    actor: session?.user?.email ? `admin:${session.user.email}` : 'admin',
    notes: body.notes ?? null,
  });

  await recordAuditLog({
    session,
    action: 'order.status_change',
    entityType: 'order',
    entityId: id,
    before: { status: order.status },
    after: { status: newStatus, trackingCode: body.trackingCode ?? null },
    metadata: { notes: body.notes ?? null },
  });

  return NextResponse.json({ id, status: newStatus });
}
