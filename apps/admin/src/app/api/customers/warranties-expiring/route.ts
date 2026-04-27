import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, productVariants, products } from '@lojeo/db';
import { and, eq, isNotNull } from 'drizzle-orm';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';
import { aggregateWarrantiesByCustomer, type WarrantyAggregateInput } from '../../../../lib/warranty/aggregate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/warranties-expiring?days=30|60|90
 *
 * Query orders entregues/pagos + JOIN com order_items + product_variants + products
 * pra obter warrantyMonths. Aggregate por customerEmail.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get('days') ?? 30);
  const daysWindow = [30, 60, 90].includes(daysParam) ? daysParam : 30;

  try {
    const rows = await db
      .select({
        customerEmail: orders.customerEmail,
        orderId: orders.id,
        orderItemId: orderItems.id,
        productId: products.id,
        productName: orderItems.productName,
        warrantyMonths: products.warrantyMonths,
        deliveredAt: orders.deliveredAt,
        paidAt: orders.paidAt,
        createdAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .leftJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(orders.tenantId, tid),
          isNotNull(orders.customerEmail),
        ),
      );

    const inputs: WarrantyAggregateInput[] = rows.map((r) => {
      const startsAt = r.deliveredAt instanceof Date
        ? r.deliveredAt
        : r.paidAt instanceof Date
          ? r.paidAt
          : r.createdAt instanceof Date
            ? r.createdAt
            : new Date(r.createdAt);
      return {
        customerEmail: r.customerEmail,
        orderId: r.orderId,
        orderItemId: r.orderItemId,
        productId: r.productId,
        productName: r.productName,
        warrantyMonths: r.warrantyMonths,
        startsAt,
      };
    });

    const summaries = aggregateWarrantiesByCustomer(inputs, daysWindow);

    return NextResponse.json({
      ok: true,
      daysWindow,
      total: summaries.length,
      customers: summaries.map((s) => ({
        customerEmail: s.customerEmail,
        itemCount: s.itemCount,
        earliestExpiresAt: s.earliestExpiresAt?.toISOString() ?? null,
        items: s.expiringSoon.map((w) => ({
          orderId: w.orderId,
          orderItemId: w.orderItemId,
          productName: w.productName,
          expiresAt: w.expiresAt?.toISOString() ?? null,
          daysRemaining: w.daysRemaining,
          status: w.status,
        })),
      })),
    });
  } catch (err) {
    console.error('[GET /api/customers/warranties-expiring]', err);
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }
}
