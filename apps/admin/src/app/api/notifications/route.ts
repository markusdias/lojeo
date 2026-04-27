import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db, sellerNotifications } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const onlyUnread = url.searchParams.get('unread') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);

  const baseScope = and(
    eq(sellerNotifications.tenantId, TENANT_ID),
    or(eq(sellerNotifications.userId, userId), isNull(sellerNotifications.userId)),
  );
  const where = onlyUnread
    ? and(baseScope, isNull(sellerNotifications.readAt))
    : baseScope;

  const rows = await db
    .select()
    .from(sellerNotifications)
    .where(where)
    .orderBy(desc(sellerNotifications.createdAt))
    .limit(limit);

  const countRows = await db
    .select({ unreadCount: sql<number>`count(*)::int` })
    .from(sellerNotifications)
    .where(and(baseScope, isNull(sellerNotifications.readAt)));
  const unreadCount = countRows[0]?.unreadCount ?? 0;

  return NextResponse.json({ notifications: rows, unreadCount });
}
