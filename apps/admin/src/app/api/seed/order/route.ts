import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, orders, orderItems, orderEvents, products } from '@lojeo/db';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * Authorization: aceita session admin OU header `x-seed-token` que confere com SEED_TOKEN env.
 * Token permite seed via curl externo sem login (útil em demo/setup inicial).
 */
async function authorized(req: NextRequest): Promise<boolean> {
  const seedToken = process.env.SEED_TOKEN;
  if (seedToken) {
    const headerToken = req.headers.get('x-seed-token');
    if (headerToken && headerToken === seedToken) return true;
  }
  const session = await auth();
  return !!session?.user;
}

interface OrderHistoryEntry {
  offsetDays: number;
  status: 'delivered' | 'cancelled';
  productName: string;
  variantName: string;
  sku: string;
  total: number;
  shippedDays: number;
  deliveredDays: number;
}

interface PersonaSpec {
  email: string;
  name: string;
  segment: 'champion' | 'at_risk' | 'lost' | 'new';
  address: {
    recipientName: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  history: OrderHistoryEntry[];
  // Pedido "principal" só pra Beatriz Champion (pra demo /pedidos/[id])
  mainOrder?: boolean;
}

const PERSONAS: PersonaSpec[] = [
  {
    email: 'beatriz.lima@email.com',
    name: 'Beatriz Lima',
    segment: 'champion',
    address: {
      recipientName: 'Beatriz Lima',
      street: 'Rua das Palmeiras',
      number: '234',
      complement: 'apto 12',
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '05428-001',
      phone: '+55 11 98472-1124',
    },
    history: [
      { offsetDays: 11, status: 'delivered', productName: 'Anel Solitário Ouro 18k', variantName: 'Tamanho 16', sku: 'ANL-OR18-001', total: 29000, shippedDays: 8, deliveredDays: 4 },
      { offsetDays: 49, status: 'delivered', productName: 'Pulseira Veneziana Prata 925', variantName: 'Tamanho único', sku: 'PUL-PRT-022', total: 189000, shippedDays: 46, deliveredDays: 42 },
      { offsetDays: 70, status: 'delivered', productName: 'Brinco Pérola Prata 950', variantName: 'Par', sku: 'BRC-PRT-014', total: 48000, shippedDays: 67, deliveredDays: 63 },
      { offsetDays: 96, status: 'delivered', productName: 'Aliança Lisa 4mm Par', variantName: 'Tamanho 16/18', sku: 'ANL-OR18-009', total: 249000, shippedDays: 93, deliveredDays: 87 },
      { offsetDays: 142, status: 'delivered', productName: 'Colar Coração Ouro Rosé', variantName: 'Corrente 45cm', sku: 'CLR-OR18-007', total: 38000, shippedDays: 139, deliveredDays: 134 },
    ],
    mainOrder: true,
  },
  {
    email: 'carolina.p@email.com',
    name: 'Carolina Paixão',
    segment: 'at_risk',
    address: {
      recipientName: 'Carolina Paixão',
      street: 'Av. Brigadeiro',
      number: '1402',
      complement: 'sala 18',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01451-888',
      phone: '+55 11 99214-3387',
    },
    history: [
      // 7 pedidos · LTV ~R$ 4.890 · última compra ~127d (At Risk)
      { offsetDays: 127, status: 'delivered', productName: 'Pulseira Riviera Cravejada', variantName: 'Tamanho 17', sku: 'PUL-OR18-030', total: 92000, shippedDays: 124, deliveredDays: 119 },
      { offsetDays: 178, status: 'delivered', productName: 'Anel Aliança Estrelas', variantName: 'Tamanho 14', sku: 'ANL-OR18-018', total: 65000, shippedDays: 175, deliveredDays: 170 },
      { offsetDays: 220, status: 'delivered', productName: 'Brinco Argola Lisa', variantName: 'Tamanho médio', sku: 'BRC-OR18-022', total: 78000, shippedDays: 217, deliveredDays: 213 },
      { offsetDays: 290, status: 'delivered', productName: 'Pingente Coração', variantName: 'Único', sku: 'PIN-OR18-005', total: 56000, shippedDays: 287, deliveredDays: 282 },
      { offsetDays: 360, status: 'delivered', productName: 'Anel Solitário Diamante', variantName: 'Tamanho 14', sku: 'ANL-OR18-002', total: 89000, shippedDays: 357, deliveredDays: 352 },
      { offsetDays: 480, status: 'delivered', productName: 'Brinco Gota Pérola', variantName: 'Par', sku: 'BRC-PRT-019', total: 49000, shippedDays: 477, deliveredDays: 472 },
      { offsetDays: 590, status: 'delivered', productName: 'Colar Veneziana Curta', variantName: '40cm', sku: 'CLR-OR18-001', total: 60000, shippedDays: 587, deliveredDays: 582 },
    ],
  },
  {
    email: 'di.vilela@email.com',
    name: 'Diana Vilela',
    segment: 'lost',
    address: {
      recipientName: 'Diana Vilela',
      street: 'Rua Visconde de Pirajá',
      number: '88',
      neighborhood: 'Ipanema',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '22418-882',
      phone: '+55 21 99812-4467',
    },
    history: [
      // 3 pedidos · LTV ~R$ 1.870 · última 438d atrás (Lost)
      { offsetDays: 438, status: 'delivered', productName: 'Brinco Solitário Prata', variantName: 'Par', sku: 'BRC-PRT-003', total: 62000, shippedDays: 435, deliveredDays: 430 },
      { offsetDays: 580, status: 'delivered', productName: 'Anel Liso Prata', variantName: 'Tamanho 18', sku: 'ANL-PRT-007', total: 58000, shippedDays: 577, deliveredDays: 572 },
      { offsetDays: 720, status: 'delivered', productName: 'Colar Bola Lisa', variantName: '45cm', sku: 'CLR-PRT-002', total: 67000, shippedDays: 717, deliveredDays: 712 },
    ],
  },
  {
    email: 'ju.tavares@email.com',
    name: 'Júlia Tavares',
    segment: 'new',
    address: {
      recipientName: 'Júlia Tavares',
      street: 'Rua Espírito Santo',
      number: '567',
      neighborhood: 'Savassi',
      city: 'Belo Horizonte',
      state: 'MG',
      postalCode: '30160-038',
      phone: '+55 31 98765-1122',
    },
    history: [
      // 1 pedido · 1d atrás (New)
      { offsetDays: 1, status: 'delivered', productName: 'Brinco Mini Argola Ouro 18k', variantName: 'Par', sku: 'BRC-OR18-001', total: 38000, shippedDays: 0, deliveredDays: 0 },
    ],
  },
];

/**
 * POST /api/seed/order
 *
 * Cria 4 personas demo (Champion / At Risk / Lost / New) match design oficial
 * Customer screens (Images 15-23). Histórico de pedidos por persona com
 * timeline + addresses realistas + RFM dimensions configuradas.
 *
 * Beatriz Champion também recebe 1 pedido principal "shipped" pra demo /pedidos/[id].
 *
 * metadata.seed=true permite cleanup via DELETE.
 *
 * Auth: session admin OU header x-seed-token=$SEED_TOKEN.
 */
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Pega primeiro produto ativo (necessário pro main order Champion)
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
  let counter = Number(countRows[0]?.c ?? 0) + 1;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const createdOrders: { id: string; orderNumber: string; persona: string }[] = [];
  let mainOrderId: string | null = null;
  let mainOrderNumber: string | null = null;

  for (const persona of PERSONAS) {
    for (const h of persona.history) {
      const ordNum = `PED-${String(counter).padStart(5, '0')}`;
      const createdAt = new Date(now - h.offsetDays * DAY);
      const shippedAt = h.shippedDays > 0 ? new Date(now - h.shippedDays * DAY) : createdAt;
      const deliveredAt = new Date(now - h.deliveredDays * DAY);
      const subtotal = h.total - 2890;
      const shipping = 2890;
      const total = h.total;

      const [created] = await db.insert(orders).values({
        tenantId: TENANT_ID,
        orderNumber: ordNum,
        status: h.status,
        customerEmail: persona.email,
        shippingAddress: persona.address,
        shippingCarrier: 'Correios Sedex',
        shippingService: 'Sedex',
        shippingDeadlineDays: 3,
        shippingCents: shipping,
        subtotalCents: subtotal,
        discountCents: 0,
        totalCents: total,
        paymentMethod: 'pix',
        paymentGateway: 'mercado_pago',
        gatewayPaymentId: 'mp_seed_' + counter,
        gatewayStatus: 'approved',
        shippedAt,
        deliveredAt,
        invoiceKey: `NFe-2826-${String(counter).padStart(5, '0')}`,
        metadata: { seed: true, persona: persona.segment },
        createdAt,
        updatedAt: deliveredAt,
      }).returning();

      counter += 1;
      if (!created) continue;
      createdOrders.push({ id: created.id, orderNumber: ordNum, persona: persona.name });

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

    // Main order só pra Beatriz Champion (demo /pedidos/[id] match Image #9)
    if (persona.mainOrder) {
      const mainNum = `PED-${String(counter).padStart(5, '0')}`;
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
        customerEmail: persona.email,
        shippingAddress: persona.address,
        shippingCarrier: 'Correios Sedex',
        shippingService: 'Sedex',
        shippingDeadlineDays: 3,
        shippingCents: shipping,
        subtotalCents: subtotal,
        discountCents: couponDiscount,
        totalCents: total,
        paymentMethod: 'pix',
        paymentGateway: 'mercado_pago',
        gatewayPaymentId: 'mp_seed_main_' + counter,
        gatewayStatus: 'approved',
        couponCode: 'BEMVINDA10',
        couponDiscountCents: couponDiscount,
        trackingCode: 'BR482374O123BR',
        shippedAt: shippedAtMain,
        invoiceKey: `NFe-2826-${String(counter).padStart(5, '0')}`,
        metadata: { seed: true, persona: persona.segment, main: true },
        createdAt: paidAt,
        updatedAt: shippedAtMain,
      }).returning();

      counter += 1;
      if (mainOrder) {
        mainOrderId = mainOrder.id;
        mainOrderNumber = mainNum;
        createdOrders.push({ id: mainOrder.id, orderNumber: mainNum, persona: persona.name });
        await db.insert(orderItems).values({
          orderId: mainOrder.id,
          tenantId: TENANT_ID,
          productName: firstProduct.name ?? 'Anel Solitário Ouro 18k',
          variantName: 'Tamanho 16',
          sku: firstProduct.sku ?? 'ANL-OR18-001',
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
    }
  }

  return NextResponse.json({
    ok: true,
    personas: PERSONAS.map(p => ({
      name: p.name,
      email: p.email,
      segment: p.segment,
      profileUrl: `/clientes/${encodeURIComponent(p.email)}`,
      ordersCreated: p.history.length,
    })),
    mainOrderId,
    mainOrderNumber,
    mainOrderUrl: mainOrderId ? `/pedidos/${mainOrderId}` : null,
    totalCreated: createdOrders.length,
  });
}

/**
 * DELETE /api/seed/order
 *
 * Limpa todos os pedidos com metadata.seed = true (cleanup pós-demo).
 * Auth: session admin OU header x-seed-token=$SEED_TOKEN.
 */
export async function DELETE(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const seedOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), sql`${orders.metadata} ->> 'seed' = 'true'`))
    .orderBy(desc(orders.createdAt));

  if (seedOrders.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  let deleted = 0;
  for (const o of seedOrders) {
    await db.delete(orders).where(and(eq(orders.tenantId, TENANT_ID), eq(orders.id, o.id)));
    deleted++;
  }

  return NextResponse.json({ ok: true, deleted });
}
