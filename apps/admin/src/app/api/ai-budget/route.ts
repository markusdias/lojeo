import { NextResponse } from 'next/server';
import { db, aiCalls, tenants } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface AiBudgetResponse {
  monthlyLimitCents: number;
  monthlyLimitUsd: number;
  monthToDateUsd: number;
  monthToDateCents: number;
  forecastEndOfMonthUsd: number;
  daysIntoMonth: number;
  daysInMonth: number;
  utilizationPercent: number;
  forecastUtilizationPercent: number;
  alert: 'ok' | 'warn' | 'over_forecast' | 'over';
  alertMessage: string;
}

export async function GET() {
  const tid = TENANT_ID();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const daysIntoMonth = now.getDate();

  // Fetch tenant config
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tid)).limit(1);
  const config = (tenant?.config ?? {}) as { brandGuide?: { aiMonthlyLimitCents?: number } };
  const monthlyLimitCents = Number(config.brandGuide?.aiMonthlyLimitCents ?? 0); // 0 = ilimitado

  // Sum cost month-to-date (cost_usd_micro = USD * 1_000_000)
  const [agg] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${aiCalls.costUsdMicro}), 0)::bigint`,
    })
    .from(aiCalls)
    .where(and(eq(aiCalls.tenantId, tid), gte(aiCalls.createdAt, startOfMonth)));

  const monthToDateMicro = Number(agg?.total ?? 0);
  const monthToDateUsd = monthToDateMicro / 1_000_000;
  const monthToDateCents = monthToDateUsd * 100;

  // Linear forecast end-of-month
  const dailyAvgUsd = daysIntoMonth > 0 ? monthToDateUsd / daysIntoMonth : 0;
  const forecastEndOfMonthUsd = dailyAvgUsd * daysInMonth;

  // Utilization (limit em cents — convert to USD para comparar)
  const limitUsd = monthlyLimitCents / 100;
  const utilizationPercent = limitUsd > 0 ? (monthToDateUsd / limitUsd) * 100 : 0;
  const forecastUtilizationPercent = limitUsd > 0 ? (forecastEndOfMonthUsd / limitUsd) * 100 : 0;

  // Alert classification
  let alert: AiBudgetResponse['alert'] = 'ok';
  let alertMessage = 'Consumo dentro do limite.';
  if (limitUsd > 0) {
    if (monthToDateUsd >= limitUsd) {
      alert = 'over';
      alertMessage = `Limite mensal atingido — $${monthToDateUsd.toFixed(2)} de $${limitUsd.toFixed(2)}.`;
    } else if (forecastEndOfMonthUsd >= limitUsd) {
      alert = 'over_forecast';
      alertMessage = `Projeção excede limite — $${forecastEndOfMonthUsd.toFixed(2)} previstos vs $${limitUsd.toFixed(2)} limite.`;
    } else if (utilizationPercent >= 80) {
      alert = 'warn';
      alertMessage = `Atenção — ${utilizationPercent.toFixed(0)}% do limite mensal usado.`;
    }
  } else {
    alertMessage = 'Sem limite configurado.';
  }

  const body: AiBudgetResponse = {
    monthlyLimitCents,
    monthlyLimitUsd: limitUsd,
    monthToDateUsd: Number(monthToDateUsd.toFixed(4)),
    monthToDateCents: Number(monthToDateCents.toFixed(2)),
    forecastEndOfMonthUsd: Number(forecastEndOfMonthUsd.toFixed(4)),
    daysIntoMonth,
    daysInMonth,
    utilizationPercent: Number(utilizationPercent.toFixed(1)),
    forecastUtilizationPercent: Number(forecastUtilizationPercent.toFixed(1)),
    alert,
    alertMessage,
  };

  return NextResponse.json(body);
}
