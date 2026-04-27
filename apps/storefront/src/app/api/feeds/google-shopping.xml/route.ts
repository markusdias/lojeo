import { NextResponse } from 'next/server';
import { db, products, productImages, inventoryStock, productVariants } from '@lojeo/db';
import { and, eq } from 'drizzle-orm';
import { buildGoogleShoppingFeedXml, type GoogleShoppingItemInput } from '../../../../lib/feeds/google-shopping';
import { getActiveTemplate } from '../../../../template';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';
const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET() {
  const tpl = await getActiveTemplate();

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      sku: products.sku,
      warrantyMonths: products.warrantyMonths,
      weightGrams: products.weightGrams,
    })
    .from(products)
    .where(and(eq(products.tenantId, TENANT_ID), eq(products.status, 'active')));

  // Cover image first per product
  const productIds = rows.map((p) => p.id);
  const imgByProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const imgs = await db
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(eq(productImages.tenantId, TENANT_ID));
    for (const i of imgs) {
      if (!imgByProduct.has(i.productId)) imgByProduct.set(i.productId, i.url);
    }
  }

  // Inventory aggregation per product (qualquer variant in stock = available)
  const variantToProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const vars = await db
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.tenantId, TENANT_ID));
    for (const v of vars) variantToProduct.set(v.id, v.productId);
  }
  const stockByProduct = new Map<string, number>();
  if (variantToProduct.size > 0) {
    const stocks = await db
      .select({ variantId: inventoryStock.variantId, qty: inventoryStock.qty, reserved: inventoryStock.reserved })
      .from(inventoryStock)
      .where(eq(inventoryStock.tenantId, TENANT_ID));
    for (const s of stocks) {
      const pid = variantToProduct.get(s.variantId);
      if (!pid) continue;
      const available = Math.max(0, s.qty - s.reserved);
      stockByProduct.set(pid, (stockByProduct.get(pid) ?? 0) + available);
    }
  }

  const items: GoogleShoppingItemInput[] = rows.map((p) => ({
    id: p.sku ?? p.id,
    title: p.name,
    description: p.description ?? p.name,
    link: `${BASE_URL}/produtos/${p.slug}`,
    imageLink: imgByProduct.get(p.id) ?? null,
    priceCents: p.priceCents,
    currency: p.currency || tpl.currency,
    availability: (stockByProduct.get(p.id) ?? 0) > 0 ? 'in stock' : 'out of stock',
    condition: 'new',
    brand: tpl.name.split('—')[0]?.trim() ?? tpl.name,
    productType: tpl.id === 'jewelry-v1' ? 'Joias' : tpl.id === 'coffee-v1' ? 'Specialty Coffee' : 'Geral',
    warrantyMonths: p.warrantyMonths ?? undefined,
    shippingWeightG: p.weightGrams ?? undefined,
  }));

  const xml = buildGoogleShoppingFeedXml({
    storeName: tpl.name,
    storeUrl: BASE_URL,
    feedDescription: tpl.description ?? `${tpl.name} product feed`,
    items,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
