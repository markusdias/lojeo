import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import { db, orders, behaviorEvents } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const PAID_STATUSES = ['paid', 'preparing', 'shipped', 'delivered'];
const SUPPORTED_MODELS = ['last_click', 'first_click', 'linear'] as const;
type AttributionModel = (typeof SUPPORTED_MODELS)[number];

interface AttributionRow {
  source: string;
  medium: string;
  campaign: string;
  orders: number;
  revenue: number;
  aov: number;
  conversionRate: number;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30', 10), 1), 365);
  const modelParam = url.searchParams.get('model') ?? 'last_click';
  const model: AttributionModel = (SUPPORTED_MODELS as readonly string[]).includes(modelParam)
    ? (modelParam as AttributionModel)
    : 'last_click';

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const tid = TENANT_ID();

  let note: string | null = null;
  if (model === 'first_click') {
    note = 'first_click v1 = last_click até trackear sessão completa (UTM no primeiro pageview do anonymousId)';
  } else if (model === 'linear') {
    note = 'linear v1 = last_click até trackear jornada completa (divisão de receita entre todos os UTMs do path)';
  }

  // v1: todos os modelos retornam last-click (snapshot de UTM no order)
  try {
    // Aggregação: orders pagos+ últimos N dias agrupados por (source, medium, campaign)
    const aggRows = await db
      .select({
        source: orders.utmSource,
        medium: orders.utmMedium,
        campaign: orders.utmCampaign,
        orderCount: sql<number>`COUNT(*)::int`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::bigint`,
      })
      .from(orders)
      .where(and(
        eq(orders.tenantId, tid),
        gte(orders.createdAt, since),
        inArray(orders.status, PAID_STATUSES),
      ))
      .groupBy(orders.utmSource, orders.utmMedium, orders.utmCampaign);

    // Para conversionRate: total de sessões (anonymousId distintos) por UTM em behavior_events
    // metadata jsonb pode conter utm_source/utm_medium/utm_campaign
    // Buscamos apenas as sessões que tem algum UTM associado.
    const sessionRows = await db
      .select({
        source: sql<string | null>`${behaviorEvents.metadata}->>'utm_source'`,
        medium: sql<string | null>`${behaviorEvents.metadata}->>'utm_medium'`,
        campaign: sql<string | null>`${behaviorEvents.metadata}->>'utm_campaign'`,
        sessions: sql<number>`COUNT(DISTINCT ${behaviorEvents.anonymousId})::int`,
      })
      .from(behaviorEvents)
      .where(and(
        eq(behaviorEvents.tenantId, tid),
        gte(behaviorEvents.createdAt, since),
      ))
      .groupBy(
        sql`${behaviorEvents.metadata}->>'utm_source'`,
        sql`${behaviorEvents.metadata}->>'utm_medium'`,
        sql`${behaviorEvents.metadata}->>'utm_campaign'`,
      );

    const sessionMap = new Map<string, number>();
    for (const s of sessionRows) {
      const key = `${s.source ?? ''}|${s.medium ?? ''}|${s.campaign ?? ''}`;
      sessionMap.set(key, Number(s.sessions ?? 0));
    }

    const data: AttributionRow[] = aggRows.map((r) => {
      const source = r.source ?? '(direct)';
      const medium = r.medium ?? '(none)';
      const campaign = r.campaign ?? '(none)';
      const orderCount = Number(r.orderCount ?? 0);
      const revenue = Number(r.revenue ?? 0);
      const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
      const sessionsKey = `${r.source ?? ''}|${r.medium ?? ''}|${r.campaign ?? ''}`;
      const sessions = sessionMap.get(sessionsKey) ?? 0;
      const conversionRate = sessions > 0 ? orderCount / sessions : 0;
      return {
        source,
        medium,
        campaign,
        orders: orderCount,
        revenue,
        aov,
        conversionRate: Number(conversionRate.toFixed(4)),
      };
    });

    data.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      windowDays: days,
      model,
      note,
      data,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg, windowDays: days, model, note, data: [] },
      { status: 500 },
    );
  }
}
