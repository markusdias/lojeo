import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, competitorProducts, competitorPriceHistory, products } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../lib/validate';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1, 'name obrigatório').max(200),
  productUrl: z
    .string()
    .trim()
    .min(1, 'productUrl obrigatório')
    .url('productUrl inválida (use URL completa)')
    .max(2000),
  ourProductId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db.select()
    .from(competitorProducts)
    .where(eq(competitorProducts.tenantId, TENANT_ID))
    .orderBy(desc(competitorProducts.createdAt));

  // Histórico últimos 30d para sparkline (carrega em batch)
  const ids = rows.map((r) => r.id);
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const history = ids.length > 0
    ? await db.select({
        id: competitorPriceHistory.id,
        competitorProductId: competitorPriceHistory.competitorProductId,
        priceCents: competitorPriceHistory.priceCents,
        inStock: competitorPriceHistory.inStock,
        capturedAt: competitorPriceHistory.capturedAt,
      })
        .from(competitorPriceHistory)
        .where(inArray(competitorPriceHistory.competitorProductId, ids))
    : [];

  // Preços próprios (para gap)
  const ourIds = rows
    .map((r) => r.ourProductId)
    .filter((v): v is string => !!v);
  const ourPrices = ourIds.length > 0
    ? await db.select({ id: products.id, priceCents: products.priceCents, name: products.name })
        .from(products)
        .where(inArray(products.id, ourIds))
    : [];

  const historyByCompetitor: Record<string, typeof history> = {};
  for (const h of history) {
    if (h.capturedAt && new Date(h.capturedAt).getTime() < sinceIso.getTime()) continue;
    const arr = historyByCompetitor[h.competitorProductId] ?? [];
    arr.push(h);
    historyByCompetitor[h.competitorProductId] = arr;
  }
  for (const k of Object.keys(historyByCompetitor)) {
    historyByCompetitor[k]?.sort((a, b) => +new Date(a.capturedAt) - +new Date(b.capturedAt));
  }

  return NextResponse.json({
    competitors: rows,
    history: historyByCompetitor,
    ourProducts: ourPrices,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const parsed = await parseOrError(req, createSchema);
  if (parsed instanceof NextResponse) return parsed;

  const [created] = await db.insert(competitorProducts).values({
    tenantId: TENANT_ID,
    name: parsed.name,
    productUrl: parsed.productUrl,
    ourProductId: parsed.ourProductId ?? null,
  }).returning();

  await recordAuditLog({
    session,
    action: 'competitor.create',
    entityType: 'competitor',
    entityId: created?.id ?? null,
    after: { name: parsed.name, productUrl: parsed.productUrl, ourProductId: parsed.ourProductId ?? null },
  });

  return NextResponse.json({ competitor: created }, { status: 201 });
}
