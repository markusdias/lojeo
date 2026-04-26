import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, orders, orderItems, orderEvents, products } from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/seed/order
 *
 * Cria pedidos fake match design oficial Customer.jsx Champion (Beatriz Lima).
 * Cria 5 pedidos no histórico de Beatriz (LTV ~R$ 6.180, Champion segment) +
 * 1 pedido principal "em trânsito" pra exibição /pedidos/[id].
 *
 * Match design Image #4 (cliente perfil) + Image #9 (pedido detail).
 *
 * Restritivo: só admin logado. metadata.seed=true permite cleanup.
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

  const customerEmail = 'beatriz.lima@email.com';
  const customerAddress = {
    recipientName: 'Beatriz Lima',
    street: 'Rua das Palmeiras',
    number: '234',
    complement: 'apto 12',
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '05428-001',
    phone: '+55 11 98472-1124',
  };

  // Próximo orderNumber baseado no count atual
  const countRows = await db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).where(eq(orders.tenantId, TENANT_ID));
  const startNum = Number(countRows[0]?.c ?? 0) + 1;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // 5 pedidos antigos do histórico Champion (LTV ~R$ 6.180 acumulado)
  // + 1 pedido principal "shipped" pra demo /pedidos/[id]
  const HISTORY = [
    { offsetDays: 11, status: 'delivered' as const, productName: 'Anel Solitário Ouro 18k', variantName: 'Tamanho 16', sku: 'ANL-OR18-016', total: 29000, shippedDays: 8, deliveredDays: 4 },
    { offsetDays: 49, status: 'delivered' as const, productName: 'Pulseira Veneziana Prata 925', variantName: 'Tamanho único', sku: 'PUL-PRT-022', total: 189000, shippedDays: 46, deliveredDays: 42 },
    { offsetDays: 70, status: 'delivered' as const, productName: 'Brinco Pérola Prata 950', variantName: 'Par', sku: 'BRC-PRT-014', total: 48000, shippedDays: 67, deliveredDays: 63 },
    { offsetDays: 96, status: 'delivered' as const, productName: 'Aliança Lisa 4mm Par', variantName: 'Tamanho 16/18', sku: 'ANL-OR18-009', total: 249000, shippedDays: 93, deliveredDays: 87 },
    { offsetDays: 142, status: 'delivered' as const, productName: 'Colar Coração Ouro Rosé', variantName: 'Corrente 45cm', sku: 'CLR-OR18-007', total: 38000, shippedDays: 139, deliveredDays: 134 },
  ];

  const createdOrders: { id: string; orderNumber: string }[] = [];

  for (let i = 0; i < HISTORY.length; i++) {
    const h = HISTORY[i]!;
    const ordNum = `PED-${String(startNum + i).padStart(5, '0')}`;
    const createdAt = new Date(now - h.offsetDays * DAY);
    const shippedAt = new Date(now - h.shippedDays * DAY);
    const deliveredAt = new Date(now - h.deliveredDays * DAY);
    const subtotal = h.total - 2890;
    const shipping = 2890;
    const total = h.total;

    const [created] = await db.insert(orders).values({
      tenantId: TENANT_ID,
      orderNumber: ordNum,
      status: h.status,
      customerEmail,
      shippingAddress: customerAddress,
      shippingCarrier: 'Correios Sedex',
      shippingService: 'Sedex',
      shippingDeadlineDays: 3,
      shippingCents: shipping,
      subtotalCents: subtotal,
      discountCents: 0,
      totalCents: total,
      paymentMethod: 'pix',
      paymentGateway: 'mercado_pago',
      gatewayPaymentId: 'mp_seed_' + (startNum + i),
      gatewayStatus: 'approved',
      shippedAt,
      deliveredAt,
      invoiceKey: `NFe-2826-${String(startNum + i).padStart(5, '0')}`,
      metadata: { seed: true },
      createdAt,
      updatedAt: deliveredAt,
    }).returning();

    if (!created) continue;
    createdOrders.push({ id: created.id, orderNumber: ordNum });

    await db.insert(orderItems).values({
      orderId: created.id,
      tenantId: TENANT_ID,
      productName: h.productName,
      variantName: h.variantName,
      sku: h.sku,
      imageUrl: null,
      options: {},
      unitPriceCents: subtotal,
      qty: 1,
      totalCents: subtotal,
    });

    await db.insert(orderEvents).values([
      { orderId: created.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'pending', toStatus: 'paid', actor: 'system', createdAt },
      { orderId: created.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'paid', toStatus: 'shipped', actor: 'admin', createdAt: shippedAt },
      { orderId: created.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'shipped', toStatus: 'delivered', actor: 'system', createdAt: deliveredAt },
    ]);
  }

  // Pedido principal "shipped" pra demo /pedidos/[id] match Image #9
  const mainNum = `PED-${String(startNum + HISTORY.length).padStart(5, '0')}`;
  const subtotal = firstProduct.priceCents;
  const shipping = 2890;
  const couponDiscount = Math.round(subtotal * 0.1);
  const total = subtotal + shipping - couponDiscount;
  const paidAt = new Date(now - 2 * 60 * 60 * 1000);
  const preparingAt = new Date(now - 1 * 60 * 60 * 1000 - 22 * 60 * 1000);
  const shippedAtMain = new Date(now - 50 * 60 * 1000);

  const [mainOrder] = await db.insert(orders).values({
    tenantId: TENANT_ID,
    orderNumber: mainNum,
    status: 'shipped',
    customerEmail,
    shippingAddress: customerAddress,
    shippingCarrier: 'Correios Sedex',
    shippingService: 'Sedex',
    shippingDeadlineDays: 3,
    shippingCents: shipping,
    subtotalCents: subtotal,
    discountCents: couponDiscount,
    totalCents: total,
    paymentMethod: 'pix',
    paymentGateway: 'mercado_pago',
    gatewayPaymentId: 'mp_seed_main_' + (startNum + HISTORY.length),
    gatewayStatus: 'approved',
    couponCode: 'BEMVINDA10',
    couponDiscountCents: couponDiscount,
    trackingCode: 'BR482374O123BR',
    shippedAt: shippedAtMain,
    invoiceKey: `NFe-2826-${String(startNum + HISTORY.length).padStart(5, '0')}`,
    metadata: { seed: true },
    createdAt: paidAt,
    updatedAt: shippedAtMain,
  }).returning();

  if (mainOrder) {
    createdOrders.push({ id: mainOrder.id, orderNumber: mainNum });
    await db.insert(orderItems).values({
      orderId: mainOrder.id,
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
    await db.insert(orderEvents).values([
      { orderId: mainOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'pending', toStatus: 'paid', actor: 'system', notes: 'Pagamento confirmado pelo Mercado Pago.', createdAt: paidAt },
      { orderId: mainOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'paid', toStatus: 'preparing', actor: 'admin', notes: 'Iniciando separação no ateliê.', createdAt: preparingAt },
      { orderId: mainOrder.id, tenantId: TENANT_ID, eventType: 'status_changed', fromStatus: 'preparing', toStatus: 'shipped', actor: 'admin', notes: 'Entregue à transportadora.', createdAt: shippedAtMain },
    ]);
  }

  return NextResponse.json({
    ok: true,
    customerEmail,
    customerProfileUrl: `/clientes/${encodeURIComponent(customerEmail)}`,
    mainOrderId: mainOrder?.id,
    mainOrderNumber: mainNum,
    mainOrderUrl: mainOrder ? `/pedidos/${mainOrder.id}` : null,
    totalCreated: createdOrders.length,
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
