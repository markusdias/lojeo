import { NextResponse } from 'next/server';
import { db, orders, orderItems, orderEvents, coupons, calcCouponDiscountCents, emitSellerNotification } from '@lojeo/db';
import { createMercadoPagoPreference, createMercadoPagoPixPayment } from '../../../lib/payments/mercado-pago';
import { sendOrderConfirmationEmail, sendPixGeneratedEmail } from '../../../lib/email/transactional';
import { eq, and, sql } from 'drizzle-orm';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

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
  customerEmail?: string | null;
  couponCode?: string;
  anonymousId?: string;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null } | null;
  gift?: { isGift: boolean; message?: string | null; packagingCents?: number | null } | null;
  giftCardCode?: string | null;
}

export async function POST(req: Request) {
  try {
    // Rate limit: 10 pedidos/15min/IP — protege contra fraude e bots
    const ip = getClientIp(req);
    const rl = checkRateLimit({ key: `orders:${ip}`, max: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Muitos pedidos em curto intervalo. Aguarde alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

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
    let shippingCents = freeShipping ? 0 : body.shipping.priceCents;
    // Pix gets 5% discount
    const pixDiscount = body.paymentMethod === 'pix' ? Math.round(subtotalCents * 0.05) : 0;

    // ── Coupon lookup + atomic increment ────────────────────────────────────
    let couponDiscountCents = 0;
    let couponCodePersisted: string | null = null;
    const rawCouponCode = body.couponCode?.trim().toUpperCase();
    if (rawCouponCode && rawCouponCode.length >= 2) {
      // Lookup case-insensitive (codes stored uppercased)
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.tenantId, tid), sql`LOWER(${coupons.code}) = LOWER(${rawCouponCode})`))
        .limit(1);

      if (!coupon) {
        return NextResponse.json({ error: 'coupon_invalid', reason: 'not_found' }, { status: 400 });
      }
      if (!coupon.active) {
        return NextResponse.json({ error: 'coupon_invalid', reason: 'inactive' }, { status: 400 });
      }
      const now = Date.now();
      if (coupon.startsAt && coupon.startsAt.getTime() > now) {
        return NextResponse.json({ error: 'coupon_invalid', reason: 'not_started' }, { status: 400 });
      }
      if (coupon.endsAt && coupon.endsAt.getTime() <= now) {
        return NextResponse.json({ error: 'coupon_invalid', reason: 'expired' }, { status: 400 });
      }
      if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usesCount >= coupon.maxUses) {
        return NextResponse.json({ error: 'coupon_invalid', reason: 'exhausted' }, { status: 400 });
      }
      if (coupon.minOrderCents > 0 && subtotalCents < coupon.minOrderCents) {
        return NextResponse.json(
          { error: 'coupon_invalid', reason: 'below_minimum', minOrderCents: coupon.minOrderCents },
          { status: 400 },
        );
      }

      // Atomic increment: prevents race conditions on maxUses.
      // The UPDATE only succeeds if the row still satisfies the cap at write time.
      const claimed = await db.execute(sql`
        UPDATE coupons
        SET uses_count = uses_count + 1, updated_at = NOW()
        WHERE id = ${coupon.id}
          AND active = TRUE
          AND (max_uses IS NULL OR uses_count < max_uses)
        RETURNING id
      `);
      const claimedRows = (claimed as unknown as { rows?: unknown[] }).rows
        ?? (Array.isArray(claimed) ? (claimed as unknown[]) : []);
      if (!claimedRows || claimedRows.length === 0) {
        return NextResponse.json(
          { error: 'coupon_race_condition', reason: 'exhausted' },
          { status: 409 },
        );
      }

      // Apply discount
      if (coupon.type === 'free_shipping') {
        // Zero out shipping; couponDiscountCents stays 0 (discount lives in the freight column)
        shippingCents = 0;
        couponDiscountCents = 0;
      } else {
        couponDiscountCents = calcCouponDiscountCents(coupon.type, coupon.value, subtotalCents);
      }
      couponCodePersisted = coupon.code;
    }

    // Gift packaging additive
    const giftPackagingCents = body.gift?.packagingCents ?? 0;

    // Gift card lookup + atomic abate balance (Sprint 5 critério)
    let giftCardDiscountCents = 0;
    let giftCardCodePersisted: string | null = null;
    const giftCardCodeRaw = body.giftCardCode?.trim().toUpperCase();
    if (giftCardCodeRaw && giftCardCodeRaw.length >= 8) {
      const subtotalAfterDiscounts = Math.max(
        0,
        subtotalCents - pixDiscount - couponDiscountCents + shippingCents + giftPackagingCents,
      );
      // Atomic abate: deduct min(balance, subtotalAfterDiscounts) from card.
      // Set status='used' if card hits zero.
      const claimed = await db.execute(sql`
        UPDATE gift_cards
        SET current_balance_cents = GREATEST(0, current_balance_cents - LEAST(current_balance_cents, ${subtotalAfterDiscounts})),
            status = CASE WHEN current_balance_cents - LEAST(current_balance_cents, ${subtotalAfterDiscounts}) <= 0 THEN 'used' ELSE status END
        WHERE tenant_id = ${tid}
          AND code = ${giftCardCodeRaw}
          AND status = 'active'
          AND current_balance_cents > 0
          AND (expires_at IS NULL OR expires_at > NOW())
        RETURNING code, LEAST(current_balance_cents + LEAST(current_balance_cents, ${subtotalAfterDiscounts}), ${subtotalAfterDiscounts}) as applied_cents
      `);
      const claimedRows = (claimed as unknown as { rows?: Array<{ code: string; applied_cents: number }> }).rows ?? [];
      if (claimedRows.length > 0) {
        giftCardDiscountCents = Math.min(Number(claimedRows[0]!.applied_cents ?? 0), subtotalAfterDiscounts);
        giftCardCodePersisted = giftCardCodeRaw;
      } else {
        return NextResponse.json(
          { error: 'gift_card_invalid', reason: 'not_found_or_expired' },
          { status: 400 },
        );
      }
    }

    const totalCents = Math.max(
      0,
      subtotalCents - pixDiscount - couponDiscountCents + shippingCents + giftPackagingCents - giftCardDiscountCents,
    );

    const orderNumber = await nextOrderNumber(tid);

    const inserted = await db.insert(orders).values({
      tenantId: tid,
      orderNumber,
      customerEmail: body.customerEmail?.toLowerCase().trim() ?? null,
      anonymousId: body.anonymousId,
      status: 'pending',
      shippingAddress: body.shippingAddress,
      shippingCarrier: body.shipping.carrier,
      shippingService: body.shipping.service,
      shippingDeadlineDays: body.shipping.deadlineDays,
      shippingCents,
      subtotalCents,
      discountCents: pixDiscount + couponDiscountCents,
      totalCents,
      paymentMethod: body.paymentMethod,
      paymentGateway: 'mercadopago',
      couponCode: couponCodePersisted,
      couponDiscountCents,
      utmSource: body.utm?.source ?? null,
      utmMedium: body.utm?.medium ?? null,
      utmCampaign: body.utm?.campaign ?? null,
      isGift: body.gift?.isGift ?? false,
      giftMessage: body.gift?.message ?? null,
      giftPackagingCents,
      giftCardCode: giftCardCodePersisted,
      giftCardDiscountCents,
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

    // Mercado Pago preference creation (modo mock se sem ACCESS_TOKEN)
    const baseUrl = process.env.STOREFRONT_PUBLIC_URL ?? '';
    const preference = await createMercadoPagoPreference({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents,
      payerEmail: body.customerEmail ?? null,
      items: body.items.map((it) => ({
        title: it.productName,
        quantity: it.qty,
        unit_price: it.unitPriceCents / 100,
        currency_id: 'BRL',
      })),
      notificationUrl: baseUrl ? `${baseUrl}/api/webhooks/mercado-pago` : undefined,
      successUrl: baseUrl ? `${baseUrl}/checkout/confirmacao?order=${order.id}` : `/checkout/confirmacao?order=${order.id}`,
      failureUrl: baseUrl ? `${baseUrl}/checkout/falha?order=${order.id}` : `/checkout/falha?order=${order.id}`,
    });

    if (preference.source === 'mp') {
      await db
        .update(orders)
        .set({ gatewayPaymentId: preference.id, paymentGateway: 'mercadopago' })
        .where(eq(orders.id, order.id));
    }

    // Pix direto: cria payment com QR + copia-e-cola, dispara email com QR.
    let pixData: { qrCode: string; qrCodeBase64: string; ticketUrl: string | null } | null = null;
    if (body.paymentMethod === 'pix' && body.customerEmail) {
      const pix = await createMercadoPagoPixPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        payerEmail: body.customerEmail,
      });
      pixData = { qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64, ticketUrl: pix.ticketUrl };
      // Persiste pixData em order.metadata.pix pra render em /checkout/confirmacao
      // após redirect MP (sessão diferente, sem provider state).
      const updateData: Record<string, unknown> = {
        metadata: {
          shippingLabel: body.shipping.label,
          pix: pixData,
        },
      };
      if (pix.source === 'mp') {
        updateData.gatewayPaymentId = pix.paymentId;
        updateData.gatewayStatus = 'pending';
      }
      await db.update(orders).set(updateData).where(eq(orders.id, order.id));
      void sendPixGeneratedEmail({
        customerEmail: body.customerEmail,
        orderCode: order.orderNumber,
        amountCents: totalCents,
        qrCodeBase64: pix.qrCodeBase64,
        pixCopyPaste: pix.qrCode,
      });
    }

    if (body.customerEmail) {
      void sendOrderConfirmationEmail({
        storeName: process.env.STOREFRONT_STORE_NAME ?? 'Atelier',
        storeFromEmail: process.env.STOREFRONT_FROM_EMAIL,
        customerName: body.customerEmail.split('@')[0] ?? 'Cliente',
        customerEmail: body.customerEmail,
        orderCode: order.orderNumber,
        items: body.items.map((it) => ({
          name: it.productName,
          detail: it.variantName ?? `${it.qty}×`,
          price: `R$ ${(it.unitPriceCents / 100).toFixed(2).replace('.', ',')}`,
        })),
        subtotalCents,
        shippingCents,
        shippingLabel: `Frete (${body.shipping.label ?? body.shipping.carrier})`,
        totalCents,
        storeBaseUrl: baseUrl || 'https://lojeo.app',
        orderId: order.id,
      });
    }

    void emitSellerNotification({
      tenantId: tid,
      type: 'order.created',
      severity: 'info',
      title: `Novo pedido #${order.orderNumber}`,
      body: `R$ ${(totalCents / 100).toFixed(2).replace('.', ',')} · ${body.paymentMethod} · ${body.customerEmail ?? 'sem email'}`,
      link: `/pedidos/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        totalCents,
        paymentMethod: body.paymentMethod,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents,
      paymentMethod: body.paymentMethod,
      payment: {
        provider: preference.source,
        preferenceId: preference.id,
        initPoint: preference.initPoint,
        pix: pixData,
      },
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
