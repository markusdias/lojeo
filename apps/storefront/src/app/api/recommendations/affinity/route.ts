import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, sql, desc, ne } from 'drizzle-orm';
import { db, behaviorEvents, products, productCollections } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const ANON_RE = /^[0-9a-f-]{8,64}$/i;

/**
 * GET /api/recommendations/affinity?anonymousId=X&limit=4
 *
 * Anonymous recurrent visitor personalization:
 * 1. Pega product_view events do anonymousId últimos 30d
 * 2. Identifica produtos vistos com count >= 2 (engajamento)
 * 3. Resolve coleções via product_collections
 * 4. Retorna top N produtos das mesmas coleções (excl. já vistos),
 *    ordenados por created_at DESC
 *
 * Sem dados (visitante novo, single view): retorna empty + reason='no_history'.
 * Modo degradado: try/catch retorna empty silencioso.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const anonymousId = url.searchParams.get('anonymousId')?.trim() ?? '';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '4', 10), 1), 12);

  if (!anonymousId || !ANON_RE.test(anonymousId)) {
    return NextResponse.json({ products: [], reason: 'invalid_anon' }, { status: 400 });
  }

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Produtos vistos pelo anônimo últimos 30d, count
    const viewed = await db
      .select({
        entityId: behaviorEvents.entityId,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(behaviorEvents)
      .where(and(
        eq(behaviorEvents.tenantId, TENANT_ID),
        eq(behaviorEvents.anonymousId, anonymousId),
        eq(behaviorEvents.eventType, 'product_view'),
        gte(behaviorEvents.createdAt, since),
        sql`${behaviorEvents.entityId} IS NOT NULL`,
      ))
      .groupBy(behaviorEvents.entityId);

    // Cliente recorrente = pelo menos 1 produto visto >= 2 vezes
    const engagedProductIds = viewed.filter(v => Number(v.n) >= 2 && v.entityId).map(v => v.entityId as string);
    const allViewedIds = new Set(viewed.map(v => v.entityId).filter((id): id is string => Boolean(id)));

    if (engagedProductIds.length === 0) {
      return NextResponse.json({ products: [], reason: 'no_history' });
    }

    // Coleções dos produtos engajados
    const collections = await db
      .select({ collectionId: productCollections.collectionId })
      .from(productCollections)
      .where(inArray(productCollections.productId, engagedProductIds));

    const collectionIds = Array.from(new Set(collections.map(c => c.collectionId)));
    if (collectionIds.length === 0) {
      return NextResponse.json({ products: [], reason: 'no_collections' });
    }

    // Candidatos: produtos das mesmas coleções, excl. já vistos
    const candidatesRows = await db
      .select({ productId: productCollections.productId })
      .from(productCollections)
      .where(inArray(productCollections.collectionId, collectionIds));

    const candidateIds = Array.from(new Set(
      candidatesRows
        .map(r => r.productId)
        .filter(id => !allViewedIds.has(id)),
    ));

    if (candidateIds.length === 0) {
      return NextResponse.json({ products: [], reason: 'no_candidates' });
    }

    // Resolve detalhes ordenando por novidade
    const suggestions = await db
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
        inArray(products.id, candidateIds),
        ne(products.id, ''),
      ))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    if (suggestions.length === 0) {
      return NextResponse.json({ products: [], reason: 'no_active_candidates' });
    }

    return NextResponse.json({
      products: suggestions.map(p => ({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
      })),
      reason: 'anon_affinity',
      sourceProductsViewed: engagedProductIds.length,
    });
  } catch (err) {
    return NextResponse.json({ products: [], reason: 'error', error: String(err) });
  }
}
