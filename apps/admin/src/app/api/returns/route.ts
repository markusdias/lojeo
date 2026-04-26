import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, gte } from 'drizzle-orm';
import { db, returnRequests, RETURN_STATUSES, RETURN_TYPES } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const days = parseInt(searchParams.get('days') ?? '90', 10);

  const conditions = [eq(returnRequests.tenantId, TENANT_ID)];

  if (status && (RETURN_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(returnRequests.status, status));
  }
  if (type && (RETURN_TYPES as readonly string[]).includes(type)) {
    conditions.push(eq(returnRequests.type, type));
  }
  if (days > 0 && days <= 365) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    conditions.push(gte(returnRequests.createdAt, since));
  }

  const rows = await db
    .select()
    .from(returnRequests)
    .where(and(...conditions))
    .orderBy(desc(returnRequests.createdAt))
    .limit(200);

  return NextResponse.json({ returns: rows });
}
