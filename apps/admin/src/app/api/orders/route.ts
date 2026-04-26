import { NextResponse } from 'next/server';
import { db, orders } from '@lojeo/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const VALID_STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const days = parseInt(searchParams.get('days') ?? '30', 10);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 25;
  const tid = tenantId();

  const conditions = [eq(orders.tenantId, tid)];
  if (status && VALID_STATUSES.includes(status)) {
    conditions.push(eq(orders.status, status));
  }
  if (days > 0 && days <= 365) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    conditions.push(gte(orders.createdAt, since));
  }

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(...conditions)),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return NextResponse.json({
    orders: rows,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
}
