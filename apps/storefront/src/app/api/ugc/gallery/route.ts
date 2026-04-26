import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, ugcPosts } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Galeria pública — fotos aprovadas, opcionalmente filtradas por produto tagueado
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '24', 10), 60);

  const conditions = [eq(ugcPosts.tenantId, TENANT_ID), eq(ugcPosts.status, 'approved')];
  if (productId) {
    // products_tagged is jsonb array of objects: filter where any element has productId
    conditions.push(
      sql`products_tagged @> ${JSON.stringify([{ productId }])}::jsonb`
    );
  }

  const rows = await db
    .select({
      id: ugcPosts.id,
      imageUrl: ugcPosts.imageUrl,
      thumbnailUrl: ugcPosts.thumbnailUrl,
      caption: ugcPosts.caption,
      customerName: ugcPosts.customerName,
      productsTagged: ugcPosts.productsTagged,
      approvedAt: ugcPosts.approvedAt,
    })
    .from(ugcPosts)
    .where(and(...conditions))
    .orderBy(desc(ugcPosts.approvedAt))
    .limit(limit);

  return NextResponse.json({ posts: rows });
}
