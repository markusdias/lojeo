import { NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { scoreChurnBatch, type ChurnInput } from '@lojeo/engine';
import { db, orders, sellerNotifications, emitSellerNotification } from '@lojeo/db';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const DEDUP_DAYS = 7;
const TOP_AT_RISK = 5; // top N customers crítico/alto pra emit

export async function POST() {
  // Auth: middleware bloqueia mutations sem session.
  if (process.env.NODE_ENV !== 'test') {
    const { auth } = await import('../../../../auth');
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tid = TENANT_ID;
  const since = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000);

  // Aggregate stats per customer (mesma query do GET /api/customers/churn)
  const rows = await db
    .select({
      customerEmail: orders.customerEmail,
      userId: orders.userId,
      orderCount: sql<number>`COUNT(*)::int`,
      lastOrderAt: sql<Date>`MAX(${orders.createdAt})`,
    })
    .from(orders)
    .where(eq(orders.tenantId, tid))
    .groupBy(orders.customerEmail, orders.userId)
    .orderBy(desc(sql`MAX(${orders.createdAt})`))
    .limit(500);

  const inputs: ChurnInput[] = rows.map((r) => ({
    email: r.customerEmail ?? 'unknown',
    userId: r.userId ?? null,
    orderCount: r.orderCount,
    lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
  }));

  const profiles = scoreChurnBatch(inputs);

  // Filter customers em risco crítico, ordenar por daysSinceLastOrder
  const atRisk = profiles
    .filter((p) => p.churnRisk === 'critical' || p.churnRisk === 'high')
    .sort((a, b) => (b.daysSinceLastOrder ?? 0) - (a.daysSinceLastOrder ?? 0))
    .slice(0, TOP_AT_RISK);

  let emitted = 0;
  let skipped = 0;
  for (const p of atRisk) {
    // Dedup: notification do mesmo email nas últimas 7d
    const dedupKey = p.email;
    const existing = await db
      .select({ id: sellerNotifications.id })
      .from(sellerNotifications)
      .where(
        and(
          eq(sellerNotifications.tenantId, tid),
          eq(sellerNotifications.type, 'churn.alert'),
          sql`${sellerNotifications.metadata}->>'email' = ${dedupKey}`,
          gte(sellerNotifications.createdAt, since),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const days = p.daysSinceLastOrder ?? 0;
    const result = await emitSellerNotification({
      tenantId: tid,
      type: 'churn.alert',
      severity: p.churnRisk === 'critical' ? 'critical' : 'warning',
      title: `Cliente em risco · ${p.email}`,
      body: `${days} dia${days === 1 ? '' : 's'} sem comprar (${p.orderCount} pedido${p.orderCount === 1 ? '' : 's'} no histórico). Considere envio de cupom de retenção.`,
      link: `/clientes/${encodeURIComponent(p.email)}`,
      entityType: 'customer',
      metadata: { email: p.email, daysSinceLastOrder: days, orderCount: p.orderCount, churnRisk: p.churnRisk },
    });
    if (result) emitted++;
  }

  return NextResponse.json({
    ok: true,
    scanned: profiles.length,
    atRisk: atRisk.length,
    emitted,
    skipped,
  });
}
