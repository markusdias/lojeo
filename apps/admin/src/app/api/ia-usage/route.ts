import { NextResponse } from 'next/server';
import { db, aiCalls } from '@lojeo/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Cotação USD->BRL estimativa fixa. Quando vier exchange-rate API real, trocar aqui.
const BRL_PER_USD = 5.0;

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

    // Por modelo neste mês (Haiku vs Sonnet etc)
    const byModel = await db
      .select({
        model: aiCalls.model,
        calls: sql<number>`COUNT(*)::int`,
        costUsdMicro: sql<number>`SUM(${aiCalls.costUsdMicro})::bigint`,
        inputTokens: sql<number>`SUM(${aiCalls.inputTokens})::int`,
        outputTokens: sql<number>`SUM(${aiCalls.outputTokens})::int`,
      })
      .from(aiCalls)
      .where(and(eq(aiCalls.tenantId, tid), gte(aiCalls.createdAt, startOfMonth)))
      .groupBy(aiCalls.model);

    // Últimas 50 chamadas
    const recent = await db
      .select({
        id: aiCalls.id,
        feature: aiCalls.feature,
        model: aiCalls.model,
        cached: aiCalls.cached,
        inputTokens: aiCalls.inputTokens,
        outputTokens: aiCalls.outputTokens,
        costUsdMicro: aiCalls.costUsdMicro,
        durationMs: aiCalls.durationMs,
        error: aiCalls.error,
        createdAt: aiCalls.createdAt,
      })
      .from(aiCalls)
      .where(eq(aiCalls.tenantId, tid))
      .orderBy(desc(aiCalls.createdAt))
      .limit(50);

    const totalCostUsdMicro = byFeature.reduce((s, r) => s + Number(r.costUsdMicro), 0);
    const totalCalls = byFeature.reduce((s, r) => s + r.calls, 0);
    const cachedCalls = byFeature.reduce((s, r) => s + r.cachedCalls, 0);

    const totalInputTokens = byFeature.reduce((s, r) => s + Number(r.inputTokens ?? 0), 0);
    const totalOutputTokens = byFeature.reduce((s, r) => s + Number(r.outputTokens ?? 0), 0);
    const totalCostUsd = totalCostUsdMicro / 1_000_000;

    return NextResponse.json({
      month: startOfMonth.toISOString().slice(0, 7),
      totalCalls,
      cachedCalls,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      totalCostBrl: totalCostUsd * BRL_PER_USD,
      brlPerUsd: BRL_PER_USD,
      byFeature: byFeature.map(r => ({
        feature: r.feature,
        calls: r.calls,
        cachedCalls: r.cachedCalls,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
      })),
      byModel: byModel.map(r => ({
        model: r.model,
        calls: r.calls,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
      })),
      daily: daily.map(r => ({
        day: r.day,
        calls: r.calls,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
      })),
      recent: recent.map(r => ({
        id: r.id,
        feature: r.feature,
        model: r.model,
        cached: r.cached === 1,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: Number(r.costUsdMicro) / 1_000_000,
        durationMs: r.durationMs,
        success: r.error === null,
        error: r.error,
        createdAt: r.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({
      totalCalls: 0, cachedCalls: 0, totalInputTokens: 0, totalOutputTokens: 0,
      totalCostUsd: 0, totalCostBrl: 0, brlPerUsd: BRL_PER_USD,
      byFeature: [], byModel: [], daily: [], recent: [],
    });
  }
}
