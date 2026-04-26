import { NextResponse } from 'next/server';
import { db, orders } from '@lojeo/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { scoreChurnBatch, type ChurnInput } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  return req.headers.get('x-tenant-id') ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

export async function GET(req: Request) {
  const tid = tenantId(req);

  try {
    // Aggregate order stats per customer email
    const rows = await db
      .select({
        customerEmail: orders.customerEmail,
        userId: orders.userId,
        orderCount: sql<number>`COUNT(*)::int`,
        lastOrderAt: sql<Date>`MAX(${orders.createdAt})`,
        firstOrderAt: sql<Date>`MIN(${orders.createdAt})`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tid)))
      .groupBy(orders.customerEmail, orders.userId)
      .orderBy(desc(sql`MAX(${orders.createdAt})`))
      .limit(500);

    const inputs: ChurnInput[] = rows.map(r => ({
      email: r.customerEmail ?? 'unknown',
      userId: r.userId ?? null,
      orderCount: r.orderCount,
      lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
    }));

    const profiles = scoreChurnBatch(inputs);

    return NextResponse.json({
      total: profiles.length,
      critical: profiles.filter(p => p.churnRisk === 'critical').length,
      high: profiles.filter(p => p.churnRisk === 'high').length,
      customers: profiles.slice(0, 100), // top 100 at-risk
    });
  } catch {
    return NextResponse.json({ total: 0, critical: 0, high: 0, customers: [] });
  }
}
