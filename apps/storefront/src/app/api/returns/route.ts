import { NextResponse } from 'next/server';
import { eq, and, desc, or, inArray } from 'drizzle-orm';
import {
  db,
  returnRequests,
  orders,
  orderItems,
  products,
  RETURN_TYPES,
  RETURN_REASONS,
} from '@lojeo/db';
import { emitMultichannelNotification } from '@lojeo/notifications';
import { auth } from '../../../auth';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface CreateBody {
  orderId?: string;
  orderItemId?: string | null;
  type?: string;
  reason?: string;
  reasonDetails?: string | null;
  // Guest-only: usado quando não há sessão
  customerEmail?: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const tid = tenantId();
  const userId = session.user.id;
  const email = session.user.email ?? null;

  const conditions = [eq(returnRequests.tenantId, tid)];
  if (userId && email) {
    conditions.push(or(eq(returnRequests.userId, userId), eq(returnRequests.customerEmail, email))!);
  } else if (userId) {
    conditions.push(eq(returnRequests.userId, userId));
  } else if (email) {
    conditions.push(eq(returnRequests.customerEmail, email));
  }

  const rows = await db
    .select()
    .from(returnRequests)
    .where(and(...conditions))
    .orderBy(desc(returnRequests.createdAt))
    .limit(100);

  return NextResponse.json({ returns: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  const tid = tenantId();

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 });
  }
  const type = body.type?.trim();
  if (!type || !(RETURN_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `type inválido (use ${RETURN_TYPES.join(' | ')})` }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason || !(RETURN_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: `reason inválido (use ${RETURN_REASONS.join(' | ')})` }, { status: 400 });
  }

  // ── Identificação do cliente: logado OU guest com customerEmail vinculado ─
  const sessionUserId = session?.user?.id ?? null;
  const sessionEmail = session?.user?.email?.toLowerCase().trim() ?? null;
  const guestEmail = body.customerEmail?.toLowerCase().trim() || null;

  if (!sessionUserId && !guestEmail) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  // ── Busca o pedido + valida ownership ─────────────────────────────────────
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tid), eq(orders.id, orderId)))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  // Match: userId match OU customerEmail match (case-insensitive)
  const ownerByUser = !!(sessionUserId && order.userId === sessionUserId);
  const orderEmail = order.customerEmail?.toLowerCase().trim() ?? null;
  const ownerByEmail = !!(
    (sessionEmail && orderEmail && sessionEmail === orderEmail) ||
    (guestEmail && orderEmail && guestEmail === orderEmail)
  );
  if (!ownerByUser && !ownerByEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // ── Pedido só pode entrar em devolução depois de entregue ─────────────────
  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'order_not_delivered', currentStatus: order.status },
      { status: 422 },
    );
  }

  // ── Resolve item (se informado) e valida warranty ─────────────────────────
  let orderItemId: string | null = null;
  if (body.orderItemId) {
    const [item] = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tid), eq(orderItems.id, body.orderItemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    if (!item) {
      return NextResponse.json({ error: 'order_item_not_found' }, { status: 404 });
    }
    orderItemId = item.id;
  }

  // Warranty check — usa entrega (deliveredAt) ou createdAt como base
  const allItems = orderItemId
    ? await db.select().from(orderItems).where(and(eq(orderItems.tenantId, tid), eq(orderItems.id, orderItemId)))
    : await db.select().from(orderItems).where(and(eq(orderItems.tenantId, tid), eq(orderItems.orderId, orderId)));

  if (allItems.length > 0) {
    const productNames = Array.from(new Set(allItems.map(i => i.productName)));
    const productRows = await db
      .select({ name: products.name, warrantyMonths: products.warrantyMonths })
      .from(products)
      .where(and(eq(products.tenantId, tid), inArray(products.name, productNames)));
    const warrantyByName = new Map(productRows.map(p => [p.name, p.warrantyMonths]));

    const warrantyStart = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
    const now = Date.now();
    const allExpired = allItems.every(i => {
      const months = warrantyByName.get(i.productName);
      if (months === null || months === undefined) return false; // sem garantia definida = considera ativa
      const expiresAt = warrantyStart.getTime() + months * 30 * 24 * 60 * 60 * 1000;
      return expiresAt < now;
    });
    if (allExpired) {
      return NextResponse.json({ error: 'warranty_expired' }, { status: 422 });
    }
  }

  // ── Insert return request ─────────────────────────────────────────────────
  const insertEmail = sessionEmail ?? guestEmail ?? orderEmail;
  const [created] = await db
    .insert(returnRequests)
    .values({
      tenantId: tid,
      orderId,
      orderItemId,
      userId: sessionUserId,
      customerEmail: insertEmail,
      type,
      reason,
      reasonDetails: body.reasonDetails ? String(body.reasonDetails).slice(0, 2000) : null,
      status: 'requested',
    })
    .returning();

  // Placeholder — Sprint 6 v2: enviar email de confirmação via Resend/SendGrid
  // eslint-disable-next-line no-console
  console.info('[returns] new request', { id: created?.id, orderId, type, reason, email: insertEmail });

  if (created) {
    void emitMultichannelNotification({
      tenantId: tid,
      type: 'return.requested',
      severity: 'warning',
      title: `Nova ${type === 'warranty' ? 'garantia' : type === 'exchange' ? 'troca' : 'devolução'} solicitada`,
      body: `Pedido #${order.orderNumber} · ${insertEmail ?? 'guest'} · motivo: ${reason}`,
      link: `/devolucoes/${created.id}`,
      entityType: 'return_request',
      entityId: created.id,
      metadata: { orderId, orderNumber: order.orderNumber, type, reason },
    });
  }

  return NextResponse.json({ return: created }, { status: 201 });
}
