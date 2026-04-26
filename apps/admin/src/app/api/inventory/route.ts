import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, inventoryStock, productVariants } from '@lojeo/db';
import { adjustStock, getOrCreatePrimaryLocation } from '@lojeo/engine';

const AdjustSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  qtyDelta: z.number().int(),
  movementType: z
    .enum(['inbound', 'outbound', 'adjustment', 'reservation', 'release', 'transfer'])
    .default('adjustment'),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function GET(req: Request) {
  const tid = tenantId(req);
  const url = new URL(req.url);
  const variantParam = url.searchParams.get('variantId');

  const where = variantParam
    ? and(eq(inventoryStock.tenantId, tid), eq(inventoryStock.variantId, variantParam))
    : eq(inventoryStock.tenantId, tid);

  const rows = await db
    .select({
      id: inventoryStock.id,
      variantId: inventoryStock.variantId,
      locationId: inventoryStock.locationId,
      qty: inventoryStock.qty,
      reserved: inventoryStock.reserved,
      lowStockThreshold: inventoryStock.lowStockThreshold,
      sku: productVariants.sku,
    })
    .from(inventoryStock)
    .leftJoin(productVariants, eq(productVariants.id, inventoryStock.variantId))
    .where(where);

  return NextResponse.json({ stock: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = AdjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const locationId = parsed.data.locationId ?? (await getOrCreatePrimaryLocation(tid)).id;

  const result = await adjustStock({
    tenantId: tid,
    variantId: parsed.data.variantId,
    locationId,
    qtyDelta: parsed.data.qtyDelta,
    movementType: parsed.data.movementType,
    reason: parsed.data.reason,
    referenceType: parsed.data.referenceType,
    referenceId: parsed.data.referenceId,
  });
  return NextResponse.json({ stock: result }, { status: 201 });
}
