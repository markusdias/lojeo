import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import { db, behaviorEvents } from '@lojeo/db';
import { auth } from '../../../../auth';
import { requirePermission } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

type Source = 'fbt_pdp' | 'fbt_cart' | 'related_pdp';

interface SourceStats {
  source: Source;
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

const SOURCES: Array<{ source: Source; label: string }> = [
  { source: 'fbt_pdp',     label: 'FBT — Página do produto' },
  { source: 'fbt_cart',    label: 'FBT — Carrinho' },
  { source: 'related_pdp', label: 'Produtos relacionados — PDP' },
];

/**
 * GET /api/recommendations/ctr?days=7|30|90
 *
 * Agrega impression/click events de behavior_events.metadata->>'source'
 * Retorna CTR por fonte de recomendação + total agregado.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'insights', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30', 10), 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const tid = TENANT_ID();

  try {
    const rows = await db
      .select({
        eventType: behaviorEvents.eventType,
        source: sql<string>`(${behaviorEvents.metadata}->>'source')::text`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(behaviorEvents)
      .where(and(
        eq(behaviorEvents.tenantId, tid),
        gte(behaviorEvents.createdAt, since),
        inArray(behaviorEvents.eventType, ['recommendation_impression', 'recommendation_click']),
      ))
      .groupBy(behaviorEvents.eventType, sql`(${behaviorEvents.metadata}->>'source')`);

    const tally = new Map<string, { impressions: number; clicks: number }>();
    for (const r of rows) {
      const src = r.source ?? 'unknown';
      const cur = tally.get(src) ?? { impressions: 0, clicks: 0 };
      if (r.eventType === 'recommendation_impression') cur.impressions += Number(r.n);
      if (r.eventType === 'recommendation_click') cur.clicks += Number(r.n);
      tally.set(src, cur);
    }

    const sources: SourceStats[] = SOURCES.map(s => {
      const t = tally.get(s.source) ?? { impressions: 0, clicks: 0 };
      const ctr = t.impressions > 0 ? t.clicks / t.impressions : 0;
      return { source: s.source, label: s.label, impressions: t.impressions, clicks: t.clicks, ctr };
    });

    const totalImpressions = sources.reduce((s, x) => s + x.impressions, 0);
    const totalClicks = sources.reduce((s, x) => s + x.clicks, 0);
    const totalCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    return NextResponse.json({
      days,
      since: since.toISOString(),
      sources,
      total: { impressions: totalImpressions, clicks: totalClicks, ctr: totalCtr },
    });
  } catch (err) {
    return NextResponse.json({
      days,
      since: since.toISOString(),
      sources: SOURCES.map(s => ({ ...s, impressions: 0, clicks: 0, ctr: 0 })),
      total: { impressions: 0, clicks: 0, ctr: 0 },
      error: String(err),
    });
  }
}
