import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, orders, orderItems, orderEvents, products } from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/seed/order
 *
 * Cria 1 pedido fake "PED-XXXXX" pra demo design oficial Image #9.
 * Usa primeiro produto ativo do catálogo. Cria 5 events (pending→paid→preparing→shipped→in_transit).
 * Status final: 'shipped' (em trânsito) — match design oficial.
 *
 * Restritivo: só admin logado. Não usar em prod cliente real (vai zerar quando terminar).
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Pega primeiro produto ativo
  const [firstProduct] = await db
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      sku: products.sku,
    })
    .from(products)
    .where(and(eq(products.tenantId, TENANT_ID), eq(products.status, 'active')))
    .limit(1);

  if (!firstProduct) {
    return NextResponse.json({ error: 'no_active_product' }, { status: 400 });
  }

  // Próximo orderNumber baseado no count atual
  const countRows = await db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).where(eq(orders.tenantId, TENANT_ID));
  const next = Number(countRows[0]?.c ?? 0) + 1;
  const orderNumber = `PED-${String(next).padStart(5, '0')}`;

  const subtotal = firstProduct.priceCents;
  const shipping = 2890; // R$ 28,90 frete Sedex
  const couponDiscount = Math.round(subtotal * 0.1); // -10%
  const total = subtotal + shipping - couponDiscount;

  // Datas estágio (pago 25 abr 14:32 / preparing 25 abr 15:10 / shipped 25 abr 17:45 / em trânsito agora)
  const now = new Date();
  const paidAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const preparingAt = new Date(now.getTime() - 1 * 60 * 60 * 1000 - 22 * 60 * 1000);
  const shippedAt = new Date(now.getTime() - 50 * 60 * 1000);

  // Inserir order
  const [createdOrder] = await db.insert(orders).values({
    tenantId: TENANT_ID,
    orderNumber,
    status: 'shipped',
    customerEmail: 'marina.castro@email.com',
    shippingAddress: {
      recipientName: 'Marina Castro',
      street: 'Rua das Palmeiras',
      number: '234',
      complement: 'apto 12',
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '05428-001',
      phone: '+55 11 98472-1124',
    },
    shippingCarrier: 'Correios Sedex',
    shippingService: 'Sedex',
    shippingDeadlineDays: 3,
    shippingCents: shipping,
    subtotalCents: subtotal,
    discountCents: couponDiscount,
    totalCents: total,
    paymentMethod: 'pix',
    paymentGateway: 'mercado_pago',
    gatewayPaymentId: 'mp_seed_' + next,
    gatewayStatus: 'approved',
    couponCode: 'BEMVINDA10',
    couponDiscountCents: couponDiscount,
    trackingCode: 'BR482374O123BR',
    shippedAt,
    invoiceKey: `NFe-2826-${String(next).padStart(5, '0')}`,
    metadata: { seed: true },
    createdAt: paidAt,
    updatedAt: shippedAt,
  }).returning();

  if (!createdOrder) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  // Inserir item
  await db.insert(orderItems).values({
    orderId: createdOrder.id,
    tenantId: TENANT_ID,
    productName: firstProduct.name ?? 'Anel Solitário Ouro 18k',
    variantName: 'Tamanho 16',
    sku: firstProduct.sku ?? 'ANL-OR18-016',
    imageUrl: null,
    options: { tamanho: '16' },
    unitPriceCents: subtotal,
    qty: 1,
    totalCents: subtotal,
  });

  // Eventos timeline
  await db.insert(orderEvents).values([
    { orderId: createdOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'pending', toStatus: 'paid', actor: 'system', notes: 'Pagamento confirmado pelo Mercado Pago.', createdAt: paidAt },
    { orderId: createdOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'paid', toStatus: 'preparing', actor: 'admin', notes: 'Iniciando separação no ateliê.', createdAt: preparingAt },
    { orderId: createdOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'preparing', toStatus: 'shipped', actor: 'admin', notes: 'Entregue à transportadora.', createdAt: shippedAt },
  ]);

  return NextResponse.json({
    ok: true,
    orderId: createdOrder.id,
    orderNumber,
    url: `/pedidos/${createdOrder.id}`,
  });
}

/**
 * DELETE /api/seed/order
 *
 * Limpa todos os pedidos com metadata.seed = true (cleanup pós-demo).
 */
export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Pega seed orders pra cleanup
  const seedOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), sql`${orders.metadata} ->> 'seed' = 'true'`))
    .orderBy(desc(orders.createdAt));

  if (seedOrders.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  // Cascade delete: orderItems + orderEvents via FK
  let deleted = 0;
  for (const o of seedOrders) {
    await db.delete(orders).where(and(eq(orders.tenantId, TENANT_ID), eq(orders.id, o.id)));
    deleted++;
  }

  return NextResponse.json({ ok: true, deleted });
}
