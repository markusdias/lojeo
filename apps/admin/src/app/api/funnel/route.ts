import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import { db, behaviorEvents } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const STAGES = [
  { key: 'product_view',     label: 'Viu produto',         eventTypes: ['product_view'] },
  { key: 'cart_add',         label: 'Adicionou ao carrinho', eventTypes: ['cart_add'] },
  { key: 'checkout_start',   label: 'Iniciou checkout',    eventTypes: ['checkout_start', 'checkout_step_start'] },
  { key: 'checkout_complete', label: 'Concluiu compra',     eventTypes: ['checkout_complete', 'order_created'] },
] as const;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get('days') ?? '30', 10), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const tid = TENANT_ID();

  // Para cada estágio, count distinct anonymousId que tiveram pelo menos 1 evento daquele tipo
  const stages: Array<{ key: string; label: string; uniqueSessions: number }> = [];
  try {
    for (const stage of STAGES) {
      const [row] = await db
        .select({ n: sql<number>`COUNT(DISTINCT ${behaviorEvents.anonymousId})::int` })
        .from(behaviorEvents)
        .where(and(
          eq(behaviorEvents.tenantId, tid),
          gte(behaviorEvents.createdAt, since),
          inArray(behaviorEvents.eventType, [...stage.eventTypes]),
        ));
      stages.push({
        key: stage.key,
        label: stage.label,
        uniqueSessions: Number(row?.n ?? 0),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, stages: [], totalConversion: 0, windowDays: days }, { status: 500 });
  }

  // Calcular conversion rate cumulativo
  const enriched = stages.map((s, i) => {
    const previous = i === 0 ? s.uniqueSessions : (stages[i - 1]?.uniqueSessions ?? 0);
    const dropoff = previous - s.uniqueSessions;
    const conversionFromPrevious = previous > 0 ? (s.uniqueSessions / previous) : 0;
    const conversionFromTop = stages[0] && stages[0].uniqueSessions > 0
      ? s.uniqueSessions / stages[0].uniqueSessions
      : 0;
    return {
      ...s,
      previousStageSessions: previous,
      dropoff,
      conversionFromPrevious: Number(conversionFromPrevious.toFixed(4)),
      conversionFromTop: Number(conversionFromTop.toFixed(4)),
    };
  });

  return NextResponse.json({
    windowDays: days,
    stages: enriched,
    totalConversion: enriched[enriched.length - 1]?.conversionFromTop ?? 0,
  });
}
