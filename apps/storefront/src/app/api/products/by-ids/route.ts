import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { db, products, productImages } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/products/by-ids?ids=uuid1,uuid2,...
 *
 * Lookup leve para hover-cards de pins UGC. Retorna apenas dados públicos
 * (id, name, slug, priceCents, primaryImage). Limita a 24 IDs por request.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ products: [] });
  }

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 24);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      priceCents: products.priceCents,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        inArray(products.id, ids),
      ),
    );

  // Imagem primária (position asc) por produto — uma query
  const imageRows = rows.length
    ? await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          altText: productImages.altText,
          position: productImages.position,
        })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((r) => r.id)))
        .orderBy(asc(productImages.position))
    : [];

  const firstByProduct = new Map<string, { url: string; altText: string | null }>();
  for (const img of imageRows) {
    if (!firstByProduct.has(img.productId)) {
      firstByProduct.set(img.productId, { url: img.url, altText: img.altText });
    }
  }

  const result = rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
    image: firstByProduct.get(p.id) ?? null,
  }));

  return NextResponse.json({ products: result });
}
