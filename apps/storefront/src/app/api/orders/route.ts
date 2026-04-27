import { NextResponse } from 'next/server';
import { db, orders, orderItems, orderEvents, coupons, calcCouponDiscountCents, emitSellerNotification, tenants } from '@lojeo/db';
import { createMercadoPagoPreference, createMercadoPagoPixPayment, createMercadoPagoBoletoPayment } from '../../../lib/payments/mercado-pago';
import { createStripePaymentIntent } from '../../../lib/payments/stripe';
import { selectGateway, isGatewayDecision, stripeCurrency } from '../../../lib/payments/gateway';
import { sendOrderConfirmationEmail, sendPixGeneratedEmail, sendBoletoGeneratedEmail } from '../../../lib/email/transactional';
import { sendMetaPurchase } from '../../../lib/pixels/conversions-api';
import { parseAffiliateCookie, isCookieValid } from '../../../lib/affiliates/tracking';
import { eq, and, sql } from 'drizzle-orm';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { getActiveTemplate } from '../../../template';
import { asSupportedCurrency, computeFraudScore, isDisposableEmail, isPhoneSuspicious } from '@lojeo/engine';

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
  customerName?: string | null;
  customerCpf?: string | null;
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

    // Currency-aware gateway selection — BRL=MP, USD/EUR/GBP/CAD=Stripe
    const tpl = await getActiveTemplate();
    const currency = asSupportedCurrency(tpl.currency);
    const gatewayChoice = selectGateway(currency, body.paymentMethod);
    if (!isGatewayDecision(gatewayChoice)) {
      return NextResponse.json(
        { error: gatewayChoice.error, reason: gatewayChoice.reason, currency },
        { status: 400 },
      );
    }
    const gateway = gatewayChoice.gateway;

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

    // Affiliate ref do cookie (atribuição last-touch 30d)
    const affiliateParsed = parseAffiliateCookie(req.headers.get('cookie'));
    const affiliateRef = isCookieValid(affiliateParsed) ? affiliateParsed.code : null;

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
      currency,
      paymentMethod: body.paymentMethod,
      paymentGateway: gateway,
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
      metadata: {
        shippingLabel: body.shipping.label,
        ...(affiliateRef ? { affiliateRef } : {}),
      },
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

    // Gateway dispatch — Stripe (intl) vs Mercado Pago (BRL)
    const baseUrl = process.env.STOREFRONT_PUBLIC_URL ?? '';
    let stripeData: { paymentIntentId: string; clientSecret: string; currency: string; source: 'stripe' | 'mock' } | null = null;
    let preference: { id: string | null; initPoint: string | null; source: 'mp' | 'mock' } = {
      id: null,
      initPoint: null,
      source: 'mock',
    };

    if (gateway === 'stripe') {
      const intent = await createStripePaymentIntent({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        currency: stripeCurrency(currency),
        payerEmail: body.customerEmail ?? '',
        description: `Order ${order.orderNumber}`,
      });
      stripeData = {
        paymentIntentId: intent.paymentIntentId,
        clientSecret: intent.clientSecret,
        currency,
        source: intent.source,
      };
      await db
        .update(orders)
        .set({
          gatewayPaymentId: intent.paymentIntentId,
          gatewayStatus: intent.status,
          metadata: {
            shippingLabel: body.shipping.label,
            stripe: stripeData,
          },
        })
        .where(eq(orders.id, order.id));
    } else {
      const mpResult = await createMercadoPagoPreference({
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
      preference = mpResult;

      if (preference.source === 'mp') {
        await db
          .update(orders)
          .set({ gatewayPaymentId: preference.id, paymentGateway: 'mercadopago' })
          .where(eq(orders.id, order.id));
      }
    }

    // Pix/Boleto direto: cria payment com QR/PDF, dispara email transacional.
    // Apenas BRL — Stripe path skipa este bloco.
    let pixData: { qrCode: string; qrCodeBase64: string; ticketUrl: string | null } | null = null;
    let boletoData: { boletoUrl: string; barcode: string } | null = null;
    if (gateway === 'mercadopago' && body.paymentMethod === 'pix' && body.customerEmail) {
      const pix = await createMercadoPagoPixPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        payerEmail: body.customerEmail,
        payerName: body.customerName ?? undefined,
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

    if (gateway === 'mercadopago' && body.paymentMethod === 'boleto' && body.customerEmail) {
      const boleto = await createMercadoPagoBoletoPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        payerEmail: body.customerEmail,
        payerName: body.customerName ?? undefined,
        payerCpf: body.customerCpf ?? undefined,
      });
      boletoData = { boletoUrl: boleto.boletoUrl, barcode: boleto.barcode };
      const updateData: Record<string, unknown> = {
        metadata: { shippingLabel: body.shipping.label, boleto: boletoData },
      };
      if (boleto.source === 'mp') {
        updateData.gatewayPaymentId = boleto.paymentId;
        updateData.gatewayStatus = 'pending';
      }
      await db.update(orders).set(updateData).where(eq(orders.id, order.id));

      void sendBoletoGeneratedEmail({
        customerEmail: body.customerEmail,
        orderCode: order.orderNumber,
        amountCents: totalCents,
        boletoUrl: boleto.boletoUrl,
        barcode: boleto.barcode,
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

    // Fraud score — sinais simples sem provider externo. Threshold > 70 emit critical.
    const customerEmailLower = body.customerEmail?.toLowerCase().trim() ?? null;
    let priorOrdersAllTime = 0;
    let priorOrdersLast24h = 0;
    if (customerEmailLower) {
      try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const allRows = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(orders)
          .where(and(eq(orders.tenantId, tid), eq(orders.customerEmail, customerEmailLower)));
        priorOrdersAllTime = Math.max(0, Number(allRows[0]?.count ?? 0) - 1); // exclui o just-criado
        const recentRows = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(orders)
          .where(
            and(
              eq(orders.tenantId, tid),
              eq(orders.customerEmail, customerEmailLower),
              sql`${orders.createdAt} >= ${since24h}`,
            ),
          );
        priorOrdersLast24h = Math.max(0, Number(recentRows[0]?.count ?? 0) - 1);
      } catch {
        // Falha em count: assume novato — score conservador.
      }
    }

    const couponBps = couponDiscountCents > 0 && subtotalCents > 0
      ? Math.round((couponDiscountCents / subtotalCents) * 10000)
      : 0;

    const fraudResult = computeFraudScore({
      newEmail: priorOrdersAllTime === 0,
      orderTotalCents: totalCents,
      aggressiveCouponDiscountBps: couponBps,
      ordersLast24h: priorOrdersLast24h,
      ordersAllTime: priorOrdersAllTime,
      emailIsDisposable: customerEmailLower ? isDisposableEmail(customerEmailLower) : false,
      phoneSuspicious: isPhoneSuspicious(body.shippingAddress?.phone),
    });

    if (fraudResult.score > 0) {
      try {
        await db.update(orders).set({ fraudScore: fraudResult.score }).where(eq(orders.id, order.id));
      } catch {
        // best-effort: nao quebra response.
      }
    }

    void emitSellerNotification({
      tenantId: tid,
      type: 'order.created',
      severity: fraudResult.score >= 70 ? 'critical' : 'info',
      title: fraudResult.score >= 70
        ? `[FRAUD ${fraudResult.score}/100] Pedido #${order.orderNumber}`
        : `Novo pedido #${order.orderNumber}`,
      body: `R$ ${(totalCents / 100).toFixed(2).replace('.', ',')} · ${body.paymentMethod} · ${body.customerEmail ?? 'sem email'}${fraudResult.score >= 70 ? ` · ${fraudResult.recommendation.toUpperCase()}` : ''}`,
      link: `/pedidos/${order.id}`,
      entityType: 'order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        totalCents,
        paymentMethod: body.paymentMethod,
        fraudScore: fraudResult.score,
        fraudLevel: fraudResult.level,
        fraudRecommendation: fraudResult.recommendation,
        fraudSignals: fraudResult.signals,
      },
    });

    // Meta Conversions API server-side — Purchase event (bypassa iOS/ATT/ad-blocker).
    // Lê tenant.config.pixels.{metaPixelId, metaConversionsApiToken}. Sem token: mocked.
    void (async () => {
      try {
        const [tenantRow] = await db
          .select({ config: tenants.config })
          .from(tenants)
          .where(eq(tenants.id, tid))
          .limit(1);
        const cfg = (tenantRow?.config ?? {}) as {
          pixels?: { metaPixelId?: string; metaConversionsApiToken?: string };
        };
        const pixelId = cfg.pixels?.metaPixelId;
        const accessToken = cfg.pixels?.metaConversionsApiToken;
        if (!pixelId || !accessToken) return;
        await sendMetaPurchase({
          pixelId,
          accessToken,
          orderId: order.id,
          orderTotalCents: totalCents,
          currency,
          customerEmail: body.customerEmail ?? null,
          customerPhone: body.shippingAddress?.phone ?? null,
          contentIds: body.items.map((it) => it.variantId ?? it.sku ?? '').filter(Boolean),
          numItems: body.items.reduce((s, it) => s + it.qty, 0),
          eventSourceUrl: baseUrl ? `${baseUrl}/checkout/confirmacao?order=${order.id}` : undefined,
          clientIp: getClientIp(req),
          clientUserAgent: req.headers.get('user-agent') ?? null,
        });
      } catch (err) {
        console.warn('[meta capi]', err instanceof Error ? err.message : err);
      }
    })();

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents,
      currency,
      paymentMethod: body.paymentMethod,
      payment: {
        provider: gateway === 'stripe' ? (stripeData?.source ?? 'stripe') : preference.source,
        preferenceId: preference.id,
        initPoint: preference.initPoint,
        pix: pixData,
        boleto: boletoData,
        stripe: stripeData,
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
