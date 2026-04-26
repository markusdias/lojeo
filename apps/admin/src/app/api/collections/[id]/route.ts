import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, collections, productCollections, products } from '@lojeo/db';

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  rules: z.record(z.unknown()).optional(),
});

const AssignSchema = z.object({
  productId: z.string().uuid(),
  position: z.number().int().min(0).default(0),
});

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = tenantId(req);
  const c = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.tenantId, tid)),
  });
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Produtos da coleção (via join manual)
  const items = await db
    .select({ id: products.id, name: products.name, slug: products.slug, position: productCollections.position })
    .from(productCollections)
    .innerJoin(products, eq(products.id, productCollections.productId))
    .where(eq(productCollections.collectionId, id));

  return NextResponse.json({ collection: c, products: items });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const updated = await db
    .update(collections)
    .set(parsed.data)
    .where(and(eq(collections.id, id), eq(collections.tenantId, tid)))
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ collection: updated[0] });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = tenantId(req);
  const deleted = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.tenantId, tid)))
    .returning();
  if (deleted.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ deleted: deleted[0]!.id });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = AssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const inserted = await db
    .insert(productCollections)
    .values({ collectionId: id, productId: parsed.data.productId, position: parsed.data.position })
    .onConflictDoNothing()
    .returning();
  return NextResponse.json({ assigned: inserted[0] ?? null }, { status: 201 });
}
