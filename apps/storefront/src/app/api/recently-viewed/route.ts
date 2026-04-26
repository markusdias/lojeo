import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db, recentlyViewedItems, products } from '@lojeo/db';
import { auth } from '../../../auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/recently-viewed?limit=8
 * Retorna últimos N produtos vistos pelo user logado, com detalhes (slug, name, price).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ items: [] });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '8', 10), 20);

  // Últimos N items distinct por productId (mantém o mais recente)
  const rows = await db
    .select({
      productId: recentlyViewedItems.productId,
      viewedAt: sql<string>`MAX(${recentlyViewedItems.viewedAt})`,
    })
    .from(recentlyViewedItems)
    .where(and(
      eq(recentlyViewedItems.tenantId, TENANT_ID),
      eq(recentlyViewedItems.userId, userId),
    ))
    .groupBy(recentlyViewedItems.productId)
    .orderBy(sql`MAX(${recentlyViewedItems.viewedAt}) DESC`)
    .limit(limit);

  if (rows.length === 0) return NextResponse.json({ items: [] });

  const productIds = rows.map(r => r.productId);
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
      inArray(products.id, productIds),
    ));

  const byId = new Map(productRows.map(p => [p.id, p]));
  const items = rows
    .map(r => {
      const p = byId.get(r.productId);
      if (!p) return null;
      return { ...p, viewedAt: r.viewedAt };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}

/**
 * POST /api/recently-viewed
 * Body { productId } — registra view individual (chamado quando user logado na PDP)
 * Body { productIds: [...] } — bulk sync de localStorage ao login
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { productId?: unknown; productIds?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  // Bulk sync (localStorage → DB)
  if (Array.isArray(body.productIds)) {
    const ids = (body.productIds as unknown[]).filter(isUuid).slice(0, 20);
    if (ids.length === 0) return NextResponse.json({ ok: true, synced: 0 });

    // Insert em batch — viewedAt = now (ordem original perdida no sync, aceita)
    const values = ids.map((productId: string) => ({
      tenantId: TENANT_ID,
      userId,
      productId,
      viewedAt: new Date(),
    }));
    await db.insert(recentlyViewedItems).values(values);

    // Cleanup: manter só últimos 20 entries por user (best-effort, sem erro)
    void db.execute(sql`
      DELETE FROM recently_viewed_items
      WHERE id IN (
        SELECT id FROM recently_viewed_items
        WHERE user_id = ${userId} AND tenant_id = ${TENANT_ID}
        ORDER BY viewed_at DESC OFFSET 20
      )
    `).catch(() => null);

    return NextResponse.json({ ok: true, synced: ids.length });
  }

  // Track individual
  if (isUuid(body.productId)) {
    await db.insert(recentlyViewedItems).values({
      tenantId: TENANT_ID,
      userId,
      productId: body.productId,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
}
