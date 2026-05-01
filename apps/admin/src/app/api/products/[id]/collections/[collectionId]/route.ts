import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, productCollections, collections } from '@lojeo/db';

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

type Params = { params: Promise<{ id: string; collectionId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { id: productId, collectionId } = await params;
  const tid = tenantId(req);

  // Guard: verify collection belongs to this tenant before removing
  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.tenantId, tid)),
    columns: { id: true },
  });
  if (!col) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db
    .delete(productCollections)
    .where(
      and(
        eq(productCollections.productId, productId),
        eq(productCollections.collectionId, collectionId),
      ),
    );

  return NextResponse.json({ removed: { productId, collectionId } });
}
