import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { logger } from '@lojeo/logger';
import { db, orders, orderEvents, emitSellerNotification } from '@lojeo/db';
import {
  verifyStripeSignature,
  fetchStripePaymentIntent,
  stripeStatusToOrderStatus,
} from '../../../../lib/payments/stripe';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface StripeEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      status?: string;
      metadata?: { order_id?: string };
    };
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  const valid = await verifyStripeSignature(rawBody, sig);
  if (!valid) {
    logger.warn({ provider: 'stripe' }, 'webhook signature invalid');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let body: StripeEvent = {};
  try { body = JSON.parse(rawBody); } catch { /* */ }

  logger.info({ provider: 'stripe', type: body.type, id: body.id }, 'webhook received');

  // Apenas eventos payment_intent
  if (!body.type?.startsWith('payment_intent.')) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'not_pi_event' });
  }

  const piObj = body.data?.object;
  const piId = piObj?.id;
  if (!piId) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'no_pi_id' });
  }

  // Lookup confiável (não dependa só de payload — Stripe pode mandar parcial)
  const pi = await fetchStripePaymentIntent(piId);
  const orderId = pi?.metadata?.order_id ?? piObj.metadata?.order_id;
  const status = pi?.status ?? piObj.status;
  if (!orderId || !status) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'lookup_failed' });
  }

  const tid = tenantId();
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tid), eq(orders.id, orderId)))
    .limit(1);
  if (!order) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'order_not_found' });
  }

  const newStatus = stripeStatusToOrderStatus(status);
  if (order.status === newStatus) {
    return NextResponse.json({ ok: true, received: true, processed: false, reason: 'no_status_change' });
  }

  await db
    .update(orders)
    .set({
      status: newStatus,
      gatewayPaymentId: piId,
      gatewayStatus: status,
      paymentGateway: 'stripe',
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    orderId: order.id,
    tenantId: tid,
    eventType: `payment.${status}`,
    fromStatus: order.status,
    toStatus: newStatus,
    actor: 'gateway',
    metadata: { paymentIntentId: piId, provider: 'stripe' },
  });

  if (newStatus === 'paid') {
    void emitSellerNotification({
      tenantId: tid,
      type: 'order.paid',
      severity: 'info',
      title: `Pagamento confirmado · #${order.orderNumber}`,
      body: `${(order.totalCents / 100).toFixed(2)} via Stripe. Hora de separar.`,
      link: `/pedidos/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, provider: 'stripe' },
    });
  }

  return NextResponse.json({ ok: true, received: true, processed: true, orderId, newStatus });
}
