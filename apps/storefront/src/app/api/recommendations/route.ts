import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, ne, sql, desc } from 'drizzle-orm';
import {
  db,
  orders,
  orderItems,
  productVariants,
  products,
  productCollections,
  recommendationOverrides,
} from '@lojeo/db';
import { computeFrequentPairs, topPairsForProduct, type Order } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Cache em memória curto (60s) — evita recomputar a cada request da PDP
let cachedPairs: { computedAt: number; pairs: ReturnType<typeof computeFrequentPairs> } | null = null;
const CACHE_TTL_MS = 60 * 1000;

async function loadOrderProductPairs(): Promise<Order[]> {
  // Janela: últimos 180 dias para relevância
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  // Pedidos pagos (qualquer status pós-payment)
  const recentOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(
      eq(orders.tenantId, TENANT_ID),
      inArray(orders.status, ['paid', 'preparing', 'shipped', 'delivered']),
      gte(orders.createdAt, since),
    ))
    .limit(2000);

  if (recentOrders.length === 0) return [];

  const orderIds = recentOrders.map(o => o.id);

  // Items + join com variants para resolver productId
  const items = await db
    .select({
      orderId: orderItems.orderId,
      variantId: orderItems.variantId,
      productId: productVariants.productId,
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .where(inArray(orderItems.orderId, orderIds));

  // Agrupar por orderId
  const byOrder = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.productId) continue;
    if (!byOrder.has(it.orderId)) byOrder.set(it.orderId, new Set());
    byOrder.get(it.orderId)!.add(it.productId);
  }

  return Array.from(byOrder.entries()).map(([orderId, set]) => ({
    orderId,
    productIds: Array.from(set),
  }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const type = url.searchParams.get('type') ?? 'fbt';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '4', 10), 12);

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }
  if (type !== 'fbt') {
    return NextResponse.json({ error: 'unsupported_type', supported: ['fbt'] }, { status: 400 });
  }

  // Pairs cache
  const now = Date.now();
  if (!cachedPairs || now - cachedPairs.computedAt > CACHE_TTL_MS) {
    const ordersList = await loadOrderProductPairs();
    cachedPairs = { computedAt: now, pairs: computeFrequentPairs(ordersList, 2) };
  }

  // Carrega overrides manuais (Sprint 11) — pin/exclude por produto fonte
  const overrideRows = await db
    .select({
      recommendedProductId: recommendationOverrides.recommendedProductId,
      overrideType: recommendationOverrides.overrideType,
    })
    .from(recommendationOverrides)
    .where(and(
      eq(recommendationOverrides.tenantId, TENANT_ID),
      eq(recommendationOverrides.productId, productId),
    ));

  const pinnedIds = overrideRows
    .filter((o) => o.overrideType === 'pin')
    .map((o) => o.recommendedProductId);
  const excludedIds = new Set(
    overrideRows.filter((o) => o.overrideType === 'exclude').map((o) => o.recommendedProductId),
  );

  // FBT pairs do engine (busca ampliada para sobrar margem após excludes/dedup com pinned)
  const allPairs = topPairsForProduct(
    cachedPairs.pairs,
    productId,
    Math.max(limit * 2, limit + pinnedIds.length),
  );
  const filteredPairs = allPairs.filter((p) => !excludedIds.has(p.recommendedProductId));

  // Recommended IDs finais: pinned no topo, depois FBT filtrado, dedup, respeitando limit
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const id of pinnedIds) {
    if (id === productId || excludedIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    orderedIds.push(id);
    if (orderedIds.length >= limit) break;
  }
  for (const p of filteredPairs) {
    if (orderedIds.length >= limit) break;
    if (seen.has(p.recommendedProductId)) continue;
    seen.add(p.recommendedProductId);
    orderedIds.push(p.recommendedProductId);
  }

  if (orderedIds.length === 0) {
    // Modo degradado: bestsellers da(s) mesma(s) coleção(ões) últimos 90d
    const fallback = await fallbackBestsellers(productId, limit, excludedIds);
    if (fallback.length > 0) {
      return NextResponse.json({ products: fallback, reason: 'fallback_bestsellers' });
    }
    return NextResponse.json({ products: [], reason: 'insufficient_data' });
  }

  // Resolve product details (active only)
  const productRows = await db
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
      inArray(products.id, orderedIds),
    ));

  const byId = new Map(productRows.map((p) => [p.id, p]));
  const pairsById = new Map(filteredPairs.map((p) => [p.recommendedProductId, p]));
  const pinnedSet = new Set(pinnedIds);

  const enriched = orderedIds
    .map((id) => {
      const prod = byId.get(id);
      if (!prod) return null;
      const pair = pairsById.get(id);
      return {
        productId: prod.id,
        name: prod.name,
        slug: prod.slug,
        priceCents: prod.priceCents,
        cooccurrence: pair?.cooccurrence ?? 0,
        confidence: pair ? Number(pair.confidence.toFixed(3)) : 0,
        lift: pair ? Number(pair.lift.toFixed(2)) : 0,
        pinned: pinnedSet.has(id),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ products: enriched });
}

/**
 * Fallback "mais vendidos da coleção" — usado quando engine FBT não tem
 * dados suficientes (poucos pedidos, produto novo, sem co-occurrências).
 *
 * Estratégia:
 * 1. Identifica coleções do produto referência via product_collections
 * 2. Busca produtos das mesmas coleções (excl. próprio + excluídos por override)
 * 3. Ranqueia por count de orderItems pagos últimos 90d
 * 4. Fallback final: produtos mais recentes do tenant
 */
async function fallbackBestsellers(
  productId: string,
  limit: number,
  excludedIds: Set<string>,
): Promise<Array<{ productId: string; name: string; slug: string; priceCents: number; cooccurrence: 0; confidence: 0; lift: 0; pinned: false; fallback: true }>> {
  const collections = await db
    .select({ collectionId: productCollections.collectionId })
    .from(productCollections)
    .where(eq(productCollections.productId, productId));

  let candidateIds: string[] = [];
  if (collections.length > 0) {
    const collectionIds = collections.map(c => c.collectionId);
    const candidatesRows = await db
      .select({ productId: productCollections.productId })
      .from(productCollections)
      .where(inArray(productCollections.collectionId, collectionIds));
    candidateIds = Array.from(new Set(
      candidatesRows
        .map(r => r.productId)
        .filter(id => id !== productId && !excludedIds.has(id)),
    ));
  }

  // Sem coleção: pegar produtos ativos do tenant ordenados por created_at
  if (candidateIds.length === 0) {
    const recent = await db
      .select({ id: products.id, name: products.name, slug: products.slug, priceCents: products.priceCents })
      .from(products)
      .where(and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        ne(products.id, productId),
      ))
      .orderBy(desc(products.createdAt))
      .limit(limit);
    return recent
      .filter(p => !excludedIds.has(p.id))
      .slice(0, limit)
      .map(p => ({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        cooccurrence: 0 as const,
        confidence: 0 as const,
        lift: 0 as const,
        pinned: false as const,
        fallback: true as const,
      }));
  }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const salesCounts = await db
    .select({
      productId: productVariants.productId,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(orderItems)
    .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(
      eq(orders.tenantId, TENANT_ID),
      inArray(orders.status, ['paid', 'preparing', 'shipped', 'delivered']),
      gte(orders.createdAt, since),
      inArray(productVariants.productId, candidateIds),
    ))
    .groupBy(productVariants.productId);

  const countsById = new Map(salesCounts.map(s => [s.productId, Number(s.n)]));
  const sortedIds = candidateIds
    .filter((id): id is string => id !== null)
    .sort((a, b) => (countsById.get(b) ?? 0) - (countsById.get(a) ?? 0))
    .slice(0, limit);

  if (sortedIds.length === 0) return [];

  const productRows = await db
    .select({ id: products.id, name: products.name, slug: products.slug, priceCents: products.priceCents })
    .from(products)
    .where(and(
      eq(products.tenantId, TENANT_ID),
      eq(products.status, 'active'),
      inArray(products.id, sortedIds),
    ));

  const byId = new Map(productRows.map(p => [p.id, p]));
  return sortedIds
    .map(id => byId.get(id))
    .filter((p): p is { id: string; name: string; slug: string; priceCents: number } => Boolean(p))
    .map(p => ({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      priceCents: p.priceCents,
      cooccurrence: 0 as const,
      confidence: 0 as const,
      lift: 0 as const,
      pinned: false as const,
      fallback: true as const,
    }));
}
