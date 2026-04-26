import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, ne, sql } from 'drizzle-orm';
import { db, products, productCollections } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/products/related?productId=X&limit=4
 *
 * Retorna produtos relacionados via heurística simples (sem ML/embeddings):
 *   1. Mesma coleção (via product_collections)
 *   2. Fallback: mesma categoria do customFields (e.g. categoria=aneis)
 *   3. Fallback final: mais recentes do tenant
 *
 * Excluí o próprio produto + apenas products active.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '4', 10), 12);

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  // Lookup do produto fonte
  const [source] = await db
    .select({ id: products.id, customFields: products.customFields })
    .from(products)
    .where(and(eq(products.tenantId, TENANT_ID), eq(products.id, productId)))
    .limit(1);

  if (!source) {
    return NextResponse.json({ products: [], reason: 'source_not_found' });
  }

  // 1. Coleções do produto fonte
  const sourceCollections = await db
    .select({ collectionId: productCollections.collectionId })
    .from(productCollections)
    .where(eq(productCollections.productId, productId));

  const collectionIds = sourceCollections.map(c => c.collectionId);

  // Produtos em coleções compartilhadas, exceto o próprio
  let relatedRows: Array<{ id: string; name: string; slug: string; priceCents: number }> = [];

  if (collectionIds.length > 0) {
    const sharedRows = await db
      .selectDistinct({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
      })
      .from(products)
      .innerJoin(productCollections, eq(productCollections.productId, products.id))
      .where(and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        ne(products.id, productId),
        inArray(productCollections.collectionId, collectionIds),
      ))
      .limit(limit);
    relatedRows = sharedRows;
  }

  // 2. Fallback: mesma categoria via customFields.categoria
  if (relatedRows.length < limit) {
    const sourceFields = source.customFields as { categoria?: string } | null;
    const categoria = sourceFields?.categoria;
    if (categoria) {
      const remaining = limit - relatedRows.length;
      const seenIds = relatedRows.map(r => r.id);
      const sameCategory = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          priceCents: products.priceCents,
        })
        .from(products)
        .where(and(
          eq(products.tenantId, TENANT_ID),
          eq(products.status, 'active'),
          ne(products.id, productId),
          sql`${products.customFields}->>'categoria' = ${categoria}`,
        ))
        .limit(remaining + seenIds.length);

      for (const p of sameCategory) {
        if (relatedRows.length >= limit) break;
        if (seenIds.includes(p.id)) continue;
        relatedRows.push(p);
      }
    }
  }

  // 3. Fallback final: produtos mais recentes
  if (relatedRows.length < limit) {
    const remaining = limit - relatedRows.length;
    const seenIds = relatedRows.map(r => r.id);
    const recent = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        ne(products.id, productId),
      ))
      .orderBy(sql`${products.createdAt} DESC`)
      .limit(remaining + seenIds.length + 1);

    for (const p of recent) {
      if (relatedRows.length >= limit) break;
      if (seenIds.includes(p.id)) continue;
      relatedRows.push(p);
    }
  }

  return NextResponse.json({ products: relatedRows });
}
