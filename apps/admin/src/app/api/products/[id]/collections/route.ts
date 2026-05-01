import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, products, collections, productCollections } from '@lojeo/db';

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: productId } = await params;
  const tid = tenantId(req);

  const rows = await db
    .select({ id: collections.id, name: collections.name, slug: collections.slug })
    .from(productCollections)
    .innerJoin(collections, eq(productCollections.collectionId, collections.id))
    .where(
      and(eq(productCollections.productId, productId), eq(collections.tenantId, tid)),
    );

  return NextResponse.json({ collections: rows });
}

const AssignSchema = z.object({
  collectionId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { id: productId } = await params;
  const tid = tenantId(req);

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tid)),
    columns: { id: true },
  });
  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

  const body = await req.json();
  const parsed = AssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, parsed.data.collectionId), eq(collections.tenantId, tid)),
    columns: { id: true },
  });
  if (!col) return NextResponse.json({ error: 'collection_not_found' }, { status: 404 });

  await db
    .insert(productCollections)
    .values({
      productId,
      collectionId: parsed.data.collectionId,
      position: parsed.data.position ?? 0,
    })
    .onConflictDoNothing();

  return NextResponse.json(
    { assigned: { productId, collectionId: parsed.data.collectionId } },
    { status: 201 },
  );
}
