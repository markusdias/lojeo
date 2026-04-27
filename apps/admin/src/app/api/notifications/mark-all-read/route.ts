import { NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db, sellerNotifications } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const updated = await db
    .update(sellerNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(sellerNotifications.tenantId, TENANT_ID),
        or(eq(sellerNotifications.userId, userId), isNull(sellerNotifications.userId)),
        isNull(sellerNotifications.readAt),
      ),
    )
    .returning({ id: sellerNotifications.id });

  return NextResponse.json({ ok: true, marked: updated.length });
}
