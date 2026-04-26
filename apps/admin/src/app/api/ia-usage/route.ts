import { NextResponse } from 'next/server';
import { db, aiCalls } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  return req.headers.get('x-tenant-id') ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

export async function GET(req: Request) {
  const tid = tenantId(req);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    // Agregado por feature neste mês
    const byFeature = await db
      .select({
        feature: aiCalls.feature,
        calls: sql<number>`COUNT(*)::int`,
        cachedCalls: sql<number>`SUM(${aiCalls.cached})::int`,
        inputTokens: sql<number>`SUM(${aiCalls.inputTokens})::int`,
        outputTokens: sql<number>`SUM(${aiCalls.outputTokens})::int`,
        costUsdMicro: sql<number>`SUM(${aiCalls.costUsdMicro})::bigint`,
      })
      .from(aiCalls)
      .where(and(
        eq(aiCalls.tenantId, tid),
        gte(aiCalls.createdAt, startOfMonth),
      ))
      .groupBy(aiCalls.feature);

    // Série diária últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const daily = await db
      .select({
        day: sql<string>`DATE(${aiCalls.createdAt})`,
        calls: sql<number>`COUNT(*)::int`,
        costUsdMicro: sql<number>`SUM(${aiCalls.costUsdMicro})::bigint`,
      })
      .from(aiCalls)
      .where(and(
        eq(aiCalls.tenantId, tid),
        gte(aiCalls.createdAt, thirtyDaysAgo),
      ))
      .groupBy(sql`DATE(${aiCalls.createdAt})`)
      .orderBy(sql`DATE(${aiCalls.createdAt})`);

    const totalCostUsdMicro = byFeature.reduce((s, r) => s + Number(r.costUsdMicro), 0);
    const totalCalls = byFeature.reduce((s, r) => s + r.calls, 0);
    const cachedCalls = byFeature.reduce((s, r) => s + r.cachedCalls, 0);

    return NextResponse.json({
      month: startOfMonth.toISOString().slice(0, 7),
      totalCalls,
      cachedCalls,
      totalCostUsd: totalCostUsdMicro / 1_000_000,
      byFeature: byFeature.map(r => ({
        feature: r.feature,
        calls: r.calls,
        cachedCalls: r.cachedCalls,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
      })),
      daily: daily.map(r => ({
        day: r.day,
        calls: r.calls,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
      })),
    });
  } catch {
    return NextResponse.json({ totalCalls: 0, cachedCalls: 0, totalCostUsd: 0, byFeature: [], daily: [] });
  }
}
