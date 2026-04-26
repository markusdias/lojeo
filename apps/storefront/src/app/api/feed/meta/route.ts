import { NextResponse } from 'next/server';
import { db, products, productImages } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function csvCell(v: string | null | undefined): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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

  const images = rows.length > 0
    ? await db
        .select()
        .from(productImages)
        .where(and(eq(productImages.tenantId, tid), eq(productImages.isVideo, false)))
        .orderBy(asc(productImages.position))
    : [];

  const imageByProduct = new Map<string, string>();
  for (const img of images) {
    if (!imageByProduct.has(img.productId)) {
      imageByProduct.set(img.productId, img.url);
    }
  }

  const HEADERS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];

  const csvRows = [
    HEADERS.join(','),
    ...rows.map(p => [
      csvCell(p.id),
      csvCell(p.name),
      csvCell(p.seoDescription ?? p.description ?? p.name),
      csvCell('in stock'),
      csvCell('new'),
      csvCell(formatPrice(p.priceCents, p.currency ?? 'BRL')),
      csvCell(`${baseUrl}/produtos/${p.slug}`),
      csvCell(imageByProduct.get(p.id) ?? ''),
      csvCell('Atelier'),
    ].join(',')),
  ];

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meta-catalog.csv"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
