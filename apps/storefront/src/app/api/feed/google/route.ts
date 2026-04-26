import { NextResponse } from 'next/server';
import { db, products, productImages } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(cents: number, currency = 'BRL'): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const host = req.headers.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const tid = tenantId();

  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
    .orderBy(asc(products.createdAt));

  const productIds = rows.map(p => p.id);
  const images = productIds.length > 0
    ? await db
        .select()
        .from(productImages)
        .where(and(
          eq(productImages.tenantId, tid),
          eq(productImages.isVideo, false),
        ))
        .orderBy(asc(productImages.position))
    : [];

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    if (!imageByProduct.has(img.productId)) {
      imageByProduct.set(img.productId, img.url);
    }
  }

  const items = rows.map(p => {
    const imageUrl = imageByProduct.get(p.id) ?? '';
    const link = `${baseUrl}/produtos/${p.slug}`;
    const availability = 'in stock';
    const price = formatPrice(p.priceCents, p.currency ?? 'BRL');

    return `  <item>
    <g:id>${esc(p.id)}</g:id>
    <g:title>${esc(p.name)}</g:title>
    <g:description>${esc(p.seoDescription ?? p.description ?? p.name)}</g:description>
    <g:link>${esc(link)}</g:link>
    <g:image_link>${esc(imageUrl)}</g:image_link>
    <g:condition>new</g:condition>
    <g:availability>${availability}</g:availability>
    <g:price>${esc(price)}</g:price>
    <g:brand>Atelier</g:brand>${p.sku ? `\n    <g:mpn>${esc(p.sku)}</g:mpn>` : ''}
  </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Catálogo de produtos</title>
    <link>${baseUrl}</link>
    <description>Feed de produtos para Google Shopping</description>
${items.join('\n')}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
