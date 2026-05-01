import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, productImages } from '@lojeo/db';

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { imageId } = await params;
  const tid = tenantId(req);
  const deleted = await db
    .delete(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.tenantId, tid)))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: deleted[0]!.id });
}

const PatchImageSchema = z.object({
  position: z.number().int().min(0),
});

export async function PATCH(req: Request, { params }: Params) {
  const { imageId } = await params;
  const tid = tenantId(req);
  const body = await req.json();
  const parsed = PatchImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await db
    .update(productImages)
    .set({ position: parsed.data.position })
    .where(and(eq(productImages.id, imageId), eq(productImages.tenantId, tid)))
    .returning();
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ image: updated[0] });
}
