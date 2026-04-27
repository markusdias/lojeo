import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, inArray, sql, asc } from 'drizzle-orm';
import { db, orders, behaviorEvents } from '@lojeo/db';
import {
  computeAttribution,
  type AttributionModel,
  type OrderConversion,
  type Touchpoint,
} from '@lojeo/engine';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const PAID_STATUSES = ['paid', 'preparing', 'shipped', 'delivered'];
const SUPPORTED_MODELS = ['last_click', 'first_click', 'linear'] as const;

interface AttributionApiRow {
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
  if (model === 'first_click' || model === 'linear') {
    note =
      'first_click/linear v1: cruza behavior_events por anonymous_id/user_id matched ao pedido. Pedidos sem behavior_events caem em fallback last-click via UTM snapshot.';
  }

  try {
    // 1. Pedidos pagos+ últimos N dias com UTM snapshot
    const orderRows = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        anonymousId: orders.anonymousId,
        totalCents: orders.totalCents,
        utmSource: orders.utmSource,
        utmMedium: orders.utmMedium,
        utmCampaign: orders.utmCampaign,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(
        eq(orders.tenantId, tid),
        gte(orders.createdAt, since),
        inArray(orders.status, PAID_STATUSES),
      ));

    if (orderRows.length === 0) {
      return NextResponse.json({ windowDays: days, model, note, data: [] });
    }

    // 2. Para first/linear: buscar behavior_events com algum UTM por anonymous_id/user_id
    //    Limita a 90d antes do pedido (janela de atribuição padrão).
    const anonymousIds = Array.from(
      new Set(orderRows.map((o) => o.anonymousId).filter((x): x is string => Boolean(x))),
    );
    const userIds = Array.from(
      new Set(orderRows.map((o) => o.userId).filter((x): x is string => Boolean(x))),
    );

    const touchpointMapByAnon = new Map<string, Touchpoint[]>();
    const touchpointMapByUser = new Map<string, Touchpoint[]>();

    if ((model === 'first_click' || model === 'linear') && (anonymousIds.length || userIds.length)) {
      const lookbackSince = new Date(Date.now() - (days + 90) * 24 * 60 * 60 * 1000);
      const conditions = [
        eq(behaviorEvents.tenantId, tid),
        gte(behaviorEvents.createdAt, lookbackSince),
        sql`${behaviorEvents.metadata}->>'utm_source' IS NOT NULL`,
      ];
      const idCond: ReturnType<typeof sql> | null =
        anonymousIds.length && userIds.length
          ? sql`(${behaviorEvents.anonymousId} IN ${anonymousIds} OR ${behaviorEvents.userId} IN ${userIds})`
          : anonymousIds.length
          ? sql`${behaviorEvents.anonymousId} IN ${anonymousIds}`
          : userIds.length
          ? sql`${behaviorEvents.userId} IN ${userIds}`
          : null;
      if (idCond) conditions.push(idCond);

      const evRows = await db
        .select({
          anonymousId: behaviorEvents.anonymousId,
          userId: behaviorEvents.userId,
          source: sql<string | null>`${behaviorEvents.metadata}->>'utm_source'`,
          medium: sql<string | null>`${behaviorEvents.metadata}->>'utm_medium'`,
          campaign: sql<string | null>`${behaviorEvents.metadata}->>'utm_campaign'`,
          createdAt: behaviorEvents.createdAt,
        })
        .from(behaviorEvents)
        .where(and(...conditions))
        .orderBy(asc(behaviorEvents.createdAt))
        .limit(20000);

      for (const ev of evRows) {
        if (!ev.source) continue;
        const tp: Touchpoint = {
          source: ev.source,
          medium: ev.medium ?? '(none)',
          campaign: ev.campaign ?? undefined,
          ts: new Date(ev.createdAt),
        };
        if (ev.anonymousId) {
          const list = touchpointMapByAnon.get(ev.anonymousId) ?? [];
          list.push(tp);
          touchpointMapByAnon.set(ev.anonymousId, list);
        }
        if (ev.userId) {
          const list = touchpointMapByUser.get(ev.userId) ?? [];
          list.push(tp);
          touchpointMapByUser.set(ev.userId, list);
        }
      }
    }

    // 3. Construir OrderConversion[] aplicando fallback last-click se sem behavior_events
    const conversions: OrderConversion[] = orderRows.map((o) => {
      const tps: Touchpoint[] = [];
      if (model === 'first_click' || model === 'linear') {
        if (o.anonymousId && touchpointMapByAnon.has(o.anonymousId)) {
          tps.push(...touchpointMapByAnon.get(o.anonymousId)!);
        }
        if (o.userId && touchpointMapByUser.has(o.userId)) {
          tps.push(...touchpointMapByUser.get(o.userId)!);
        }
      }
      // Fallback: snapshot UTM no pedido como único touchpoint
      if (tps.length === 0 && o.utmSource) {
        tps.push({
          source: o.utmSource,
          medium: o.utmMedium ?? '(none)',
          campaign: o.utmCampaign ?? undefined,
          ts: new Date(o.createdAt),
        });
      } else if (tps.length === 0) {
        tps.push({
          source: '(direct)',
          medium: '(none)',
          ts: new Date(o.createdAt),
        });
      }
      return {
        orderId: o.id,
        revenueCents: o.totalCents,
        touchpoints: tps,
      };
    });

    // 4. Aplica engine
    const engineRows = computeAttribution(conversions, model);

    // 5. Sessions por UTM em behavior_events (para conv%)
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

    const data: AttributionApiRow[] = engineRows.map((r) => {
      const source = r.source || '(direct)';
      const medium = r.medium || '(none)';
      const campaign = r.campaign ?? '(none)';
      const sourceForSession = source === '(direct)' ? '' : source;
      const mediumForSession = medium === '(none)' ? '' : medium;
      const campaignForSession = campaign === '(none)' ? '' : campaign;
      const sessionsKey = `${sourceForSession}|${mediumForSession}|${campaignForSession}`;
      const sessions = sessionMap.get(sessionsKey) ?? 0;
      const conversionRate = sessions > 0 ? r.orders / sessions : 0;
      return {
        source,
        medium,
        campaign,
        orders: Number(r.orders.toFixed(4)),
        revenue: r.revenueCents,
        aov: r.aov,
        conversionRate: Number(conversionRate.toFixed(4)),
      };
    });

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
