import { NextResponse } from 'next/server';
import { db, behaviorEvents } from '@lojeo/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') ?? '7', 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const tid = tenantId();

  const [daily, byType] = await Promise.all([
    // Events per day
    db
      .select({
        day: sql<string>`DATE(${behaviorEvents.createdAt})`.as('day'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(behaviorEvents)
      .where(and(eq(behaviorEvents.tenantId, tid), gte(behaviorEvents.createdAt, since)))
      .groupBy(sql`DATE(${behaviorEvents.createdAt})`)
      .orderBy(sql`DATE(${behaviorEvents.createdAt})`),

    // Events by type
    db
      .select({
        eventType: behaviorEvents.eventType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(behaviorEvents)
      .where(and(eq(behaviorEvents.tenantId, tid), gte(behaviorEvents.createdAt, since)))
      .groupBy(behaviorEvents.eventType)
      .orderBy(desc(sql`COUNT(*)`)),
  ]);

  return NextResponse.json({ days, since: since.toISOString(), daily, byType });
}
