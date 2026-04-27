import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { logger } from '@lojeo/logger';
import { db, orders, orderEvents, emitSellerNotification } from '@lojeo/db';
import { fetchMercadoPagoPayment, mpStatusToOrderStatus } from '../../../../lib/payments/mercado-pago';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function verifySignature(req: NextRequest, _body: string): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret = aceitar (dev)
  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';
  const ts = xSignature.match(/ts=(\d+)/)?.[1];
  const v1 = xSignature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!ts || !v1) return false;
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') ?? '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return hmac === v1;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: { type?: string; data?: { id?: string }; action?: string } = {};
  try { body = JSON.parse(rawBody); } catch { /* */ }
  if (!verifySignature(req, rawBody)) {
    logger.warn({ provider: 'mercado-pago' }, 'webhook signature invalid');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  logger.info({ provider: 'mercado-pago', type: body.type, action: body.action, dataId: body.data?.id }, 'webhook received');

  const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment.');
  const paymentId = body.data?.id;

  if (!isPaymentEvent || !paymentId) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'not_payment_event' });
  }

  const payment = await fetchMercadoPagoPayment(paymentId);
  if (!payment || !payment.external_reference) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'payment_lookup_failed' });
  }

  const orderId = payment.external_reference;
  const tid = tenantId();

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tid), eq(orders.id, orderId)))
    .limit(1);

  if (!order) {
    logger.warn({ orderId, paymentId }, 'webhook: order not found');
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'order_not_found' });
  }

  const newStatus = mpStatusToOrderStatus(payment.status);
  if (order.status === newStatus) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'no_status_change' });
  }

  await db
    .update(orders)
    .set({
      status: newStatus,
      gatewayPaymentId: paymentId,
      gatewayStatus: payment.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    orderId: order.id,
    tenantId: tid,
    eventType: `payment.${payment.status}`,
    fromStatus: order.status,
    toStatus: newStatus,
    actor: 'gateway',
    metadata: { paymentId, paymentMethod: payment.payment_method_id, transactionAmount: payment.transaction_amount },
  });

  if (newStatus === 'paid') {
    void emitSellerNotification({
      tenantId: tid,
      type: 'order.paid',
      severity: 'info',
      title: `Pagamento confirmado · #${order.orderNumber}`,
      body: `R$ ${(order.totalCents / 100).toFixed(2).replace('.', ',')} via ${payment.payment_method_id}. Hora de separar.`,
      link: `/pedidos/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, paymentMethod: payment.payment_method_id },
    });
  }

  return NextResponse.json({ ok: true, received: true, processed: true, orderId, newStatus });
}
