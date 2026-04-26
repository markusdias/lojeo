import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db, orders, orderItems, products } from '@lojeo/db';
import { computeWarrantyBatch, expiringWithinDays, type WarrantyInput } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const expiringIn = url.searchParams.get('expiringIn'); // '30' | '60' | '90'
  const customerEmail = url.searchParams.get('customerEmail');
  const tid = TENANT_ID();

  // Conditions: only paid+ orders (warranty starts at delivery or paidAt fallback)
  const conditions = [
    eq(orders.tenantId, tid),
    inArray(orders.status, ['paid', 'preparing', 'shipped', 'delivered']),
  ];
  if (customerEmail) {
    conditions.push(eq(orders.customerEmail, customerEmail));
  }

  const ordersRows = await db
    .select({
      id: orders.id,
      customerEmail: orders.customerEmail,
      deliveredAt: orders.deliveredAt,
      shippedAt: orders.shippedAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(...conditions))
    .limit(500);

  if (ordersRows.length === 0) {
    return NextResponse.json({ warranties: [], counts: { active: 0, expiring_soon: 0, expired: 0, none: 0 } });
  }

  const orderIds = ordersRows.map(o => o.id);
  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      sku: orderItems.sku,
      // Aqui precisamos do productId — order_items tem variantId; vamos pegar product via variant -> product.
      // Para simplicidade v1: deixar productId null e usar productName
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  // Para warrantyMonths precisamos achar produto por nome (snapshot) — fallback: 12 meses
  // Em v1 produção: produto seria linkado via variantId → productVariants.productId.
  // Aqui vamos buscar por nome igual (best-effort).
  const productNames = Array.from(new Set(items.map(i => i.productName)));
  const productRows = productNames.length > 0
    ? await db.select({ name: products.name, warrantyMonths: products.warrantyMonths })
        .from(products)
        .where(and(eq(products.tenantId, tid), inArray(products.name, productNames)))
    : [];
  const warrantyByName = new Map<string, number | null>();
  for (const p of productRows) warrantyByName.set(p.name, p.warrantyMonths ?? null);

  const ordersById = new Map(ordersRows.map(o => [o.id, o]));

  const inputs: WarrantyInput[] = items.map(i => {
    const order = ordersById.get(i.orderId)!;
    const startsAt = order.deliveredAt ?? order.shippedAt ?? order.createdAt;
    return {
      orderId: i.orderId,
      orderItemId: i.id,
      productId: null,
      productName: i.productName,
      warrantyMonths: warrantyByName.get(i.productName) ?? 12,
      startsAt: new Date(startsAt),
    };
  });

  let warranties = computeWarrantyBatch(inputs);

  if (expiringIn) {
    const days = parseInt(expiringIn, 10);
    if (days > 0 && days <= 365) {
      warranties = expiringWithinDays(warranties, days);
    }
  }

  warranties.sort((a, b) => {
    if (a.expiresAt && b.expiresAt) return a.expiresAt.getTime() - b.expiresAt.getTime();
    return 0;
  });

  const counts = warranties.reduce<Record<string, number>>(
    (acc, w) => { acc[w.status] = (acc[w.status] ?? 0) + 1; return acc; },
    { active: 0, expiring_soon: 0, expired: 0, none: 0 },
  );

  // Enriquecer com email do cliente
  const enriched = warranties.map(w => ({
    ...w,
    customerEmail: ordersById.get(w.orderId)?.customerEmail ?? null,
  }));

  return NextResponse.json({ warranties: enriched, counts });
}
