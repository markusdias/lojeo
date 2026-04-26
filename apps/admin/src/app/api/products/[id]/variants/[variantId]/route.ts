import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, productVariants } from '@lojeo/db';

const UpdateVariantSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  optionValues: z.record(z.string()).optional(),
  priceCents: z.number().int().positive().nullable().optional(),
  stockQty: z.number().int().min(0).optional(),
  barcode: z.string().optional(),
});

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const { id, variantId } = await params;
  const body = await req.json();
  const parsed = UpdateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const updated = await db
    .update(productVariants)
    .set(parsed.data)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, id),
        eq(productVariants.tenantId, tid),
      ),
    )
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ variant: updated[0] });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const { id, variantId } = await params;
  const tid = tenantId(req);
  const deleted = await db
    .delete(productVariants)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, id),
        eq(productVariants.tenantId, tid),
      ),
    )
    .returning();
  if (deleted.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ deleted: deleted[0]!.id });
}
