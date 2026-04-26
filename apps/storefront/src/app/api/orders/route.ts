import { NextResponse } from 'next/server';
import { db, orders, orderItems, orderEvents, inventoryStock } from '@lojeo/db';
import { eq, and, sql } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const FREE_SHIPPING_ABOVE = 50000;

// Naive counter — production: use atomic DB sequence per tenant
async function nextOrderNumber(tid: string): Promise<string> {
  const result = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.tenantId, tid));
  const n = Number(result[0]?.cnt ?? 0) + 1;
  return `LJ-${String(n).padStart(5, '0')}`;
}

interface OrderItemInput {
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  options: Record<string, string>;
  unitPriceCents: number;
  qty: number;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  shippingAddress: {
    recipientName: string;
    phone?: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
  };
  shipping: {
    id: string;
    carrier: string;
    service: string;
    deadlineDays: number;
    priceCents: number;
    label: string;
  };
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  couponCode?: string;
  anonymousId?: string;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null } | null;
  gift?: { isGift: boolean; message?: string | null } | null;
}

export async function POST(req: Request) {
  try {
    const body: CreateOrderBody = await req.json();
    const tid = tenantId();

    if (!body.items?.length) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }
    if (!body.shippingAddress?.city) {
      return NextResponse.json({ error: 'Endereço inválido' }, { status: 400 });
    }
    if (!['pix', 'credit_card', 'boleto'].includes(body.paymentMethod)) {
      return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 });
    }

    const subtotalCents = body.items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0);
    const freeShipping = subtotalCents >= FREE_SHIPPING_ABOVE;
    const shippingCents = freeShipping ? 0 : body.shipping.priceCents;
    // Pix gets 5% discount
    const pixDiscount = body.paymentMethod === 'pix' ? Math.round(subtotalCents * 0.05) : 0;
    const totalCents = subtotalCents - pixDiscount + shippingCents;

    const orderNumber = await nextOrderNumber(tid);

    const inserted = await db.insert(orders).values({
      tenantId: tid,
      orderNumber,
      anonymousId: body.anonymousId,
      status: 'pending',
      shippingAddress: body.shippingAddress,
      shippingCarrier: body.shipping.carrier,
      shippingService: body.shipping.service,
      shippingDeadlineDays: body.shipping.deadlineDays,
      shippingCents,
      subtotalCents,
      discountCents: pixDiscount,
      totalCents,
      paymentMethod: body.paymentMethod,
      paymentGateway: 'mercadopago',
      couponDiscountCents: 0,
      utmSource: body.utm?.source ?? null,
      utmMedium: body.utm?.medium ?? null,
      utmCampaign: body.utm?.campaign ?? null,
      isGift: body.gift?.isGift ?? false,
      giftMessage: body.gift?.message ?? null,
      metadata: { shippingLabel: body.shipping.label },
    }).returning({ id: orders.id, orderNumber: orders.orderNumber });

    const order = inserted[0];
    if (!order) throw new Error('Falha ao criar pedido no banco');

    await db.insert(orderItems).values(
      body.items.map(item => ({
        orderId: order.id,
        tenantId: tid,
        variantId: item.variantId ?? null,
        productName: item.productName,
        variantName: item.variantName ?? null,
        sku: item.sku ?? null,
        imageUrl: item.imageUrl ?? null,
        options: item.options,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
        totalCents: item.unitPriceCents * item.qty,
      }))
    );

    await db.insert(orderEvents).values({
      orderId: order.id,
      tenantId: tid,
      eventType: 'order_created',
      toStatus: 'pending',
      actor: 'customer',
      metadata: { paymentMethod: body.paymentMethod, channel: 'storefront' },
    });

    // Sprint 3 full: trigger Mercado Pago preference creation here
    // For now: return order details, payment happens out-of-band

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents,
      paymentMethod: body.paymentMethod,
      // pixQrCode: null — populated after MP integration
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/orders]', err);
    return NextResponse.json({ error: 'Erro interno ao criar pedido' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('id');
  if (!orderId) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  }
  const order = await db.query.orders?.findFirst({
    where: and(eq(orders.tenantId, tenantId()), eq(orders.id, orderId)),
  });
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  return NextResponse.json(order);
}
