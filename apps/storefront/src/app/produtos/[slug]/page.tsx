import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db, products, productVariants, productImages, inventoryStock, behaviorEvents } from '@lojeo/db';
import { eq, and, gte, count, sql } from 'drizzle-orm';
import { getActiveTemplate } from '../../../template';
import { PDPClient } from './pdp-client';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const URGENCY_THRESHOLD = parseInt(process.env.URGENCY_THRESHOLD ?? '3', 10);
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_QTY ?? '5', 10);

interface PDPProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PDPProps): Promise<Metadata> {
  const { slug } = await params;
  const tid = tenantId();
  const product = await db.query.products.findFirst({
    where: and(eq(products.tenantId, tid), eq(products.slug, slug), eq(products.status, 'active')),
  });
  if (!product) return { title: 'Produto não encontrado' };
  return {
    title: product.seoTitle ?? `${product.name} — Atelier`,
    description: product.seoDescription ?? product.description ?? undefined,
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.description ?? undefined,
    },
  };
}

export default async function PDPPage({ params }: PDPProps) {
  const { slug } = await params;
  const tid = tenantId();
  const tpl = await getActiveTemplate();

  const product = await db.query.products.findFirst({
    where: and(eq(products.tenantId, tid), eq(products.slug, slug), eq(products.status, 'active')),
  });
  if (!product) notFound();

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [variants, images, viewersResult, stockResult] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.tenantId, tid), eq(productVariants.productId, product.id))),
    db.select().from(productImages)
      .where(and(eq(productImages.tenantId, tid), eq(productImages.productId, product.id)))
      .orderBy(productImages.position),
    db.select({ cnt: count() })
      .from(behaviorEvents)
      .where(and(
        eq(behaviorEvents.tenantId, tid),
        eq(behaviorEvents.eventType, 'product_view'),
        eq(behaviorEvents.entityId, product.id),
        gte(behaviorEvents.createdAt, fiveMinAgo),
      )),
    db.select({ qty: sql<number>`COALESCE(SUM(${inventoryStock.qty} - ${inventoryStock.reserved}), 0)` })
      .from(inventoryStock)
      .where(and(eq(inventoryStock.tenantId, tid))),
  ]);

  const viewersNow = viewersResult[0]?.cnt ?? 0;
  const totalStock = Number(stockResult[0]?.qty ?? 0);

  // Urgency signal
  type UrgencyKind = 'none' | 'viewing' | 'low-stock';
  let urgency: UrgencyKind = 'none';
  if (totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD) urgency = 'low-stock';
  else if (viewersNow >= URGENCY_THRESHOLD) urgency = 'viewing';

  return (
    <PDPClient
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        comparePriceCents: product.comparePriceCents,
        warrantyMonths: product.warrantyMonths ?? 12,
        customFields: product.customFields as Record<string, unknown>,
        seoTitle: product.seoTitle,
      }}
      variants={variants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        priceCents: v.priceCents,
        stockQty: v.stockQty,
        optionValues: v.optionValues as Record<string, unknown>,
      }))}
      images={images.map(img => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        position: img.position,
      }))}
      urgency={urgency}
      viewersNow={viewersNow}
      totalStock={totalStock}
      currency={tpl.currency}
    />
  );
}
