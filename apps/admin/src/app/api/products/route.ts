import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, products } from '@lojeo/db';
import { slugify } from '@lojeo/engine';
import { eq } from 'drizzle-orm';

const CreateProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  comparePriceCents: z.number().int().positive().optional(),
  sku: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  customFields: z.record(z.unknown()).optional(),
  warrantyMonths: z.number().int().min(0).default(12),
});

function tenantId(req: Request): string {
  const headerTenant = req.headers.get('x-tenant-id');
  return headerTenant ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

export async function GET(req: Request) {
  const tid = tenantId(req);
  const list = await db.select().from(products).where(eq(products.tenantId, tid));
  return NextResponse.json({ products: list });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const inserted = await db
    .insert(products)
    .values({
      tenantId: tid,
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      priceCents: parsed.data.priceCents,
      comparePriceCents: parsed.data.comparePriceCents,
      sku: parsed.data.sku,
      status: parsed.data.status,
      customFields: parsed.data.customFields ?? {},
      warrantyMonths: parsed.data.warrantyMonths,
    })
    .returning();
  return NextResponse.json({ product: inserted[0] }, { status: 201 });
}
