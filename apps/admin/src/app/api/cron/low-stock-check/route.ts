import { NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  db,
  inventoryStock,
  productVariants,
  products,
  sellerNotifications,
  emitSellerNotification,
} from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const DEDUP_HOURS = 24;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const since = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000);

  // Detect low stock: available (qty - reserved) <= lowStockThreshold AND threshold > 0
  const rows = await db
    .select({
      variantId: inventoryStock.variantId,
      qty: inventoryStock.qty,
      reserved: inventoryStock.reserved,
      threshold: inventoryStock.lowStockThreshold,
      productName: products.name,
      productId: products.id,
      variantName: productVariants.name,
    })
    .from(inventoryStock)
    .innerJoin(productVariants, eq(inventoryStock.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(inventoryStock.tenantId, tid),
        sql`${inventoryStock.lowStockThreshold} > 0`,
        sql`(${inventoryStock.qty} - ${inventoryStock.reserved}) <= ${inventoryStock.lowStockThreshold}`,
      ),
    );

  let emitted = 0;
  let skipped = 0;
  for (const r of rows) {
    // Dedup: notification do mesmo type + entityId nas últimas 24h
    const existing = await db
      .select({ id: sellerNotifications.id })
      .from(sellerNotifications)
      .where(
        and(
          eq(sellerNotifications.tenantId, tid),
          eq(sellerNotifications.type, 'inventory.low_stock'),
          eq(sellerNotifications.entityId, r.variantId),
          gte(sellerNotifications.createdAt, since),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const available = Math.max(0, r.qty - r.reserved);
    const result = await emitSellerNotification({
      tenantId: tid,
      type: 'inventory.low_stock',
      severity: available === 0 ? 'critical' : 'warning',
      title: available === 0 ? 'Esgotado' : `Estoque baixo · ${available} unid.`,
      body: `${r.productName}${r.variantName ? ` · ${r.variantName}` : ''} · meta ${r.threshold}`,
      link: '/inventory',
      entityType: 'product_variant',
      entityId: r.variantId,
      metadata: { available, threshold: r.threshold, productId: r.productId },
    });
    if (result) emitted++;
  }

  return NextResponse.json({ ok: true, scanned: rows.length, emitted, skipped });
}
