import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, gte } from 'drizzle-orm';
import { db, auditLogs } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'audit', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get('days') ?? '30', 10), 90);
  const action = url.searchParams.get('action');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 500);

  const conditions = [eq(auditLogs.tenantId, TENANT_ID)];
  if (days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    conditions.push(gte(auditLogs.createdAt, since));
  }
  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return NextResponse.json({ logs: rows, count: rows.length });
}
