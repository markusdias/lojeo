import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@lojeo/db';
import { eq, and, isNotNull, not } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers } from '@lojeo/engine';
import { getTenantId } from '../../../lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenantId = getTenantId(req);

  const rows = await db
    .select({
      email: orders.customerEmail,
      userId: orders.userId,
      orderCount: sql<number>`cast(count(*) as int)`,
      totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
      lastOrderAt: sql<string>`max(${orders.createdAt})`,
      firstOrderAt: sql<string>`min(${orders.createdAt})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        not(eq(orders.status, 'cancelled')),
        isNotNull(orders.customerEmail),
      )
    )
    .groupBy(orders.customerEmail, orders.userId)
    .orderBy(sql`max(${orders.createdAt}) desc`)
    .limit(500);

  const inputs = rows
    .filter(r => r.email)
    .map(r => ({
      email: r.email as string,
      userId: r.userId,
      orderCount: r.orderCount,
      totalCents: r.totalCents,
      lastOrderAt: new Date(r.lastOrderAt),
      firstOrderAt: new Date(r.firstOrderAt),
    }));

  const profiles = scoreCustomers(inputs);
  return NextResponse.json(profiles);
}
