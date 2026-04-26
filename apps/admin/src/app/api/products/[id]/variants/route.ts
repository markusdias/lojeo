import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, products, productVariants } from '@lojeo/db';

const CreateVariantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().optional(),
  optionValues: z.record(z.string()).default({}),
  priceCents: z.number().int().positive().nullable().optional(),
  stockQty: z.number().int().min(0).default(0),
  barcode: z.string().optional(),
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
  const list = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, id), eq(productVariants.tenantId, tid)));
  return NextResponse.json({ variants: list });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = CreateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.tenantId, tid)),
  });
  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

  const inserted = await db
    .insert(productVariants)
    .values({
      tenantId: tid,
      productId: id,
      sku: parsed.data.sku,
      name: parsed.data.name,
      optionValues: parsed.data.optionValues,
      priceCents: parsed.data.priceCents,
      stockQty: parsed.data.stockQty,
      barcode: parsed.data.barcode,
    })
    .returning();
  return NextResponse.json({ variant: inserted[0] }, { status: 201 });
}
