import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, experiments, experimentEvents } from '@lojeo/db';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface VariantStats {
  variantKey: string;
  variantName: string;
  weight: number;
  exposures: number;
  conversions: number;
  conversionRate: number;
  liftVsControl: number; // % diff vs primeira variante (controle implícito)
}

interface DailyPoint {
  day: string;
  variantKey: string;
  exposures: number;
  conversions: number;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;

  const [exp] = await db.select().from(experiments)
    .where(and(eq(experiments.id, id), eq(experiments.tenantId, TENANT_ID))).limit(1);
  if (!exp) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const variants = (exp.variants ?? []) as Array<{ key: string; name: string; weight: number }>;

  // Aggregate por variant + eventType
  const aggRows = await db
    .select({
      variantKey: experimentEvents.variantKey,
      eventType: experimentEvents.eventType,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(experimentEvents)
    .where(and(eq(experimentEvents.tenantId, TENANT_ID), eq(experimentEvents.experimentId, id)))
    .groupBy(experimentEvents.variantKey, experimentEvents.eventType);

  const statsMap = new Map<string, { exposures: number; conversions: number }>();
  for (const row of aggRows) {
    const cur = statsMap.get(row.variantKey) ?? { exposures: 0, conversions: 0 };
    if (row.eventType === 'exposure') cur.exposures = Number(row.n);
    else if (row.eventType === 'conversion') cur.conversions = Number(row.n);
    statsMap.set(row.variantKey, cur);
  }

  // Calcular control rate (primeira variante)
  const controlKey = variants[0]?.key;
  const controlStats = controlKey ? statsMap.get(controlKey) : null;
  const controlRate = controlStats && controlStats.exposures > 0
    ? controlStats.conversions / controlStats.exposures
    : 0;

  const variantStats: VariantStats[] = variants.map(v => {
    const s = statsMap.get(v.key) ?? { exposures: 0, conversions: 0 };
    const conversionRate = s.exposures > 0 ? s.conversions / s.exposures : 0;
    const liftVsControl = controlRate > 0
      ? ((conversionRate - controlRate) / controlRate) * 100
      : 0;
    return {
      variantKey: v.key,
      variantName: v.name,
      weight: v.weight,
      exposures: s.exposures,
      conversions: s.conversions,
      conversionRate: Number(conversionRate.toFixed(4)),
      liftVsControl: Number(liftVsControl.toFixed(2)),
    };
  });

  // Series temporal (últimos 30d) — exposures + conversions por dia × variant
  const dailyRows = await db
    .select({
      day: sql<string>`DATE(${experimentEvents.createdAt})`,
      variantKey: experimentEvents.variantKey,
      eventType: experimentEvents.eventType,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(experimentEvents)
    .where(and(
      eq(experimentEvents.tenantId, TENANT_ID),
      eq(experimentEvents.experimentId, id),
      sql`${experimentEvents.createdAt} >= NOW() - INTERVAL '30 days'`,
    ))
    .groupBy(sql`DATE(${experimentEvents.createdAt})`, experimentEvents.variantKey, experimentEvents.eventType)
    .orderBy(sql`DATE(${experimentEvents.createdAt})`);

  const dailyMap = new Map<string, DailyPoint>();
  for (const r of dailyRows) {
    const key = `${r.day}__${r.variantKey}`;
    const cur = dailyMap.get(key) ?? { day: r.day, variantKey: r.variantKey, exposures: 0, conversions: 0 };
    if (r.eventType === 'exposure') cur.exposures = Number(r.n);
    else if (r.eventType === 'conversion') cur.conversions = Number(r.n);
    dailyMap.set(key, cur);
  }
  const daily = Array.from(dailyMap.values());

  // Total geral
  const totalExposures = variantStats.reduce((s, v) => s + v.exposures, 0);
  const totalConversions = variantStats.reduce((s, v) => s + v.conversions, 0);
  const overallRate = totalExposures > 0 ? totalConversions / totalExposures : 0;

  // Significância estatística básica (p-value chi-squared não calculado v1; só recomendação por sample size)
  const significantSampleSize = variantStats.every(v => v.exposures >= 1000);

  return NextResponse.json({
    experiment: {
      id: exp.id,
      key: exp.key,
      name: exp.name,
      status: exp.status,
      startedAt: exp.startedAt,
      endedAt: exp.endedAt,
      targetMetric: exp.targetMetric,
    },
    variants: variantStats,
    daily,
    summary: {
      totalExposures,
      totalConversions,
      overallRate: Number(overallRate.toFixed(4)),
      significantSampleSize,
    },
  });
}
