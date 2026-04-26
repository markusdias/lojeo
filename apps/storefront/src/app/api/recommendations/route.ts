import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray } from 'drizzle-orm';
import {
  db,
  orders,
  orderItems,
  productVariants,
  products,
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
