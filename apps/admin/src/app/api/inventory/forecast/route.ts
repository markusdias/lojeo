import { NextResponse } from 'next/server';
import { db, products, orderItems, productVariants, orders } from '@lojeo/db';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import { forecastStockBatch, type ProductSalesData } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  return req.headers.get('x-tenant-id') ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

export async function GET(req: Request) {
  const tid = tenantId(req);

  try {
    const productList = await db
      .select({ id: products.id, name: products.name, sku: products.sku, customFields: products.customFields })
      .from(products)
      .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
      .limit(200);

    if (productList.length === 0) return NextResponse.json({ total: 0, critical: 0, warning: 0, items: [] });

    const productIds = productList.map(p => p.id);

    const variants = await db
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const variantToProduct = new Map(variants.map(v => [v.id, v.productId]));
    const variantIds = variants.map(v => v.id);

    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ago90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    async function salesByProduct(since: Date): Promise<Map<string, number>> {
      if (variantIds.length === 0) return new Map();
      // orderItems has no createdAt — join with orders to filter by date
      const rows = await db
        .select({
          variantId: orderItems.variantId,
          units: sql<number>`SUM(${orderItems.qty})::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          eq(orderItems.tenantId, tid),
          gte(orders.createdAt, since),
          inArray(orderItems.variantId, variantIds),
        ))
        .groupBy(orderItems.variantId);

      const map = new Map<string, number>();
      for (const r of rows) {
        const pid = r.variantId ? (variantToProduct.get(r.variantId) ?? null) : null;
        if (pid) map.set(pid, (map.get(pid) ?? 0) + r.units);
      }
      return map;
    }

    const [map30, map90] = await Promise.all([salesByProduct(ago30), salesByProduct(ago90)]);

    const salesData: ProductSalesData[] = productList.map(p => {
      const cf = (p.customFields ?? {}) as Record<string, unknown>;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: typeof cf.stock === 'number' ? cf.stock : 0,
        unitsSoldLast30d: map30.get(p.id) ?? 0,
        unitsSoldLast90d: map90.get(p.id) ?? 0,
      };
    });

    const forecasts = forecastStockBatch(salesData);
    return NextResponse.json({
      total: forecasts.length,
      critical: forecasts.filter(f => f.alert === 'critical').length,
      warning: forecasts.filter(f => f.alert === 'warning').length,
      items: forecasts,
    });
  } catch {
    return NextResponse.json({ total: 0, critical: 0, warning: 0, items: [] });
  }
}
