import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db, sellerNotifications } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { read?: boolean };
  const markRead = body.read !== false;

  const updated = await db
    .update(sellerNotifications)
    .set({ readAt: markRead ? new Date() : null })
    .where(
      and(
        eq(sellerNotifications.id, id),
        eq(sellerNotifications.tenantId, TENANT_ID),
        or(eq(sellerNotifications.userId, userId), isNull(sellerNotifications.userId)),
      ),
    )
    .returning({ id: sellerNotifications.id, readAt: sellerNotifications.readAt });

  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, notification: updated[0] });
}
