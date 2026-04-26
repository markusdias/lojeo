import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, ugcPosts } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Admin lista UGC com filtro por status
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const validStatuses = ['pending', 'approved', 'rejected', 'moderating'];

  const conditions = [eq(ugcPosts.tenantId, TENANT_ID)];
  if (status && validStatuses.includes(status)) {
    conditions.push(eq(ugcPosts.status, status));
  }

  const rows = await db
    .select()
    .from(ugcPosts)
    .where(and(...conditions))
    .orderBy(desc(ugcPosts.createdAt))
    .limit(200);

  // Contadores por status (sempre, ignorando filter)
  const all = await db
    .select({ status: ugcPosts.status })
    .from(ugcPosts)
    .where(eq(ugcPosts.tenantId, TENANT_ID));
  const counts = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ posts: rows, counts });
}
