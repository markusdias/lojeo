import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, orders, orderItems, orderEvents } from '@lojeo/db';
import { emitMultichannelNotification } from '@lojeo/notifications';
import { createBlingNfe } from '../../../../../lib/payments/bling';
import { TENANT_ID } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  // Auth: middleware bloqueia mutations sem session. Permission lazy.
  if (process.env.NODE_ENV !== 'test') {
    const { auth } = await import('../../../../../auth');
    const { requirePermission } = await import('../../../../../lib/roles');
    const session = await auth();
    try {
      await requirePermission(session, 'orders', 'write');
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 403 });
    }
  }

  const { id: orderId } = await ctx.params;
  const tid = TENANT_ID;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tid), eq(orders.id, orderId)))
    .limit(1);

  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });

  if (order.status !== 'paid' && order.status !== 'preparing' && order.status !== 'shipped') {
    return NextResponse.json({
      error: 'invalid_status',
      message: `NF-e só pode ser emitida para pedidos pagos ou superiores. Status atual: ${order.status}`,
    }, { status: 422 });
  }

  if (order.invoiceKey) {
    return NextResponse.json({
      ok: true,
      already: true,
      invoiceKey: order.invoiceKey,
      invoiceUrl: order.invoiceUrl,
    });
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.tenantId, tid), eq(orderItems.orderId, orderId)));

  try {
    const result = await createBlingNfe({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerEmail?.split('@')[0] ?? 'Cliente',
      customerEmail: order.customerEmail,
      items: items.map((it) => ({
        description: it.productName + (it.variantName ? ` · ${it.variantName}` : ''),
        quantity: it.qty,
        unitPriceCents: it.unitPriceCents,
      })),
      totalCents: order.totalCents,
      shippingCents: order.shippingCents,
      notes: `Pedido ${order.orderNumber}`,
    });

    await db
      .update(orders)
      .set({ invoiceKey: result.invoiceKey, invoiceUrl: result.invoiceUrl, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      orderId: order.id,
      tenantId: tid,
      eventType: result.source === 'bling' ? 'invoice.issued' : 'invoice.issued_mock',
      actor: 'system',
      metadata: { invoiceKey: result.invoiceKey, source: result.source, blingId: result.blingId },
    });

    return NextResponse.json({
      ok: true,
      source: result.source,
      invoiceKey: result.invoiceKey,
      invoiceUrl: result.invoiceUrl,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    void emitMultichannelNotification({
      tenantId: tid,
      type: 'fiscal.failed',
      severity: 'critical',
      title: `Falha ao emitir NF-e · #${order.orderNumber}`,
      body: `Erro: ${errMsg}. Tente reemitir ou emita manual no Bling.`,
      link: `/pedidos/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, error: errMsg },
    });

    return NextResponse.json({
      error: 'fiscal_failed',
      message: errMsg,
    }, { status: 502 });
  }
}
