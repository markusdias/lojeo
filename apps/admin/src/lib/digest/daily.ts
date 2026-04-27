// Daily digest aggregator — agrega métricas das últimas 24h pra cron daily-digest.
//
// Helper puro recebe `db` injetado pra ser testável com mock. Cron route consome.

import { and, eq, gte, sql } from 'drizzle-orm';
import {
  db as defaultDb,
  orders,
  supportTickets,
  inventoryStock,
  sellerNotifications,
} from '@lojeo/db';

export interface DailyDigestSnapshot {
  windowHours: number;
  ordersCount: number;
  revenueCents: number;
  ticketsOpenCount: number;
  lowStockCount: number;
  criticalAlertsCount: number;
  generatedAt: Date;
}

export interface AggregateDailyDigestInput {
  tenantId: string;
  windowHours?: number;
  database?: typeof defaultDb;
}

export async function aggregateDailyDigest(
  input: AggregateDailyDigestInput,
): Promise<DailyDigestSnapshot> {
  const database = input.database ?? defaultDb;
  const windowHours = input.windowHours ?? 24;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const ordersAgg = await database
    .select({
      count: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, input.tenantId), gte(orders.createdAt, since)));

  const ticketsAgg = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, input.tenantId), eq(supportTickets.status, 'open')));

  const lowStockAgg = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.tenantId, input.tenantId),
        sql`${inventoryStock.lowStockThreshold} > 0`,
        sql`(${inventoryStock.qty} - ${inventoryStock.reserved}) <= ${inventoryStock.lowStockThreshold}`,
      ),
    );

  const criticalAgg = await database
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(sellerNotifications)
    .where(
      and(
        eq(sellerNotifications.tenantId, input.tenantId),
        eq(sellerNotifications.severity, 'critical'),
        sql`${sellerNotifications.readAt} IS NULL`,
      ),
    );

  return {
    windowHours,
    ordersCount: Number(ordersAgg[0]?.count ?? 0),
    revenueCents: Number(ordersAgg[0]?.revenue ?? 0),
    ticketsOpenCount: Number(ticketsAgg[0]?.count ?? 0),
    lowStockCount: Number(lowStockAgg[0]?.count ?? 0),
    criticalAlertsCount: Number(criticalAgg[0]?.count ?? 0),
    generatedAt: new Date(),
  };
}

export function formatDailyDigestDateLabel(d: Date, locale: 'pt-BR' | 'en-US' = 'pt-BR'): string {
  if (locale === 'en-US') {
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });
}
