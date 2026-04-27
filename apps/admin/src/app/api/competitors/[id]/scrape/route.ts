import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, competitorProducts, competitorPriceHistory } from '@lojeo/db';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Scrape mock — Sprint 8.
 * V1 não tem scraping real (rede externa adiada para Sprint 8.5).
 * Aqui:
 *  - Se já existe lastPriceCents, gera variação ±5% (preserva tendência).
 *  - Senão, inicializa com preço aleatório 50000–500000 cents (R$500–R$5000).
 *  - 90% chance de ficar in_stock.
 *  - Persiste em competitor_price_history e atualiza lastPrice/lastInStock/lastCheckedAt.
 *  - Modo degradado: se algo falhar, mantém último valor e devolve lastError populado.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db.select()
    .from(competitorProducts)
    .where(and(eq(competitorProducts.id, id), eq(competitorProducts.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    let priceCents: number;
    if (existing.lastPriceCents && existing.lastPriceCents > 0) {
      const variation = (Math.random() - 0.5) * 0.1; // -5% a +5%
      priceCents = Math.max(100, Math.round(existing.lastPriceCents * (1 + variation)));
    } else {
      // R$500 (50000) até R$5000 (500000)
      priceCents = Math.round(50000 + Math.random() * 450000);
    }
    const inStock = Math.random() > 0.1;
    const capturedAt = new Date();

    await db.insert(competitorPriceHistory).values({
      tenantId: TENANT_ID,
      competitorProductId: id,
      priceCents,
      inStock,
      capturedAt,
    });

    const [updated] = await db.update(competitorProducts)
      .set({
        lastPriceCents: priceCents,
        lastInStock: inStock,
        lastCheckedAt: capturedAt,
        lastError: null,
      })
      .where(and(eq(competitorProducts.id, id), eq(competitorProducts.tenantId, TENANT_ID)))
      .returning();

    await recordAuditLog({
      session,
      action: 'competitor.scrape',
      entityType: 'competitor',
      entityId: id,
      after: { priceCents, inStock, capturedAt: capturedAt.toISOString() },
    });

    return NextResponse.json({ competitor: updated, scraped: { priceCents, inStock } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Modo degradado: registra erro mas não derruba
    try {
      await db.update(competitorProducts)
        .set({ lastError: msg, lastCheckedAt: new Date() })
        .where(and(eq(competitorProducts.id, id), eq(competitorProducts.tenantId, TENANT_ID)));
    } catch { /* swallow */ }
    return NextResponse.json({ error: msg, degraded: true }, { status: 502 });
  }
}
