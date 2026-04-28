import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, products, productRedirects } from '@lojeo/db';
import { slugify } from '@lojeo/engine';
import { guardPermission } from '../../../../lib/permission-guard';

const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  priceCents: z.number().int().positive().optional(),
  comparePriceCents: z.number().int().positive().nullable().optional(),
  costCents: z.number().int().positive().nullable().optional(),
  sku: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  customFields: z.record(z.unknown()).optional(),
  warrantyMonths: z.number().int().min(0).optional(),
  ncm: z.string().optional(),
  taxRegime: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  exportRestrictions: z.record(z.unknown()).optional(),
  presaleShipDate: z.string().datetime().nullable().optional(),
});

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardPermission('products', 'read');
  if (denied) return denied;
  const { id } = await params;
  const tid = tenantId(req);
  const found = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.tenantId, tid)),
  });
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ product: found });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardPermission('products', 'write');
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (data.name && !data.slug) data.slug = slugify(String(data.name));
  if (data.presaleShipDate) data.presaleShipDate = new Date(String(data.presaleShipDate));
  if (data.status === 'active' && parsed.data.status === 'active') {
    data.publishedAt = new Date();
  }

  const previous = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.tenantId, tid)),
    columns: { slug: true, status: true },
  });

  const updated = await db
    .update(products)
    .set(data)
    .where(and(eq(products.id, id), eq(products.tenantId, tid)))
    .returning();
  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const next = updated[0]!;
  if (previous) {
    const slugChanged = data.slug && previous.slug !== next.slug;
    const archived = data.status === 'archived' && previous.status !== 'archived';
    if (slugChanged) {
      await db
        .insert(productRedirects)
        .values({
          tenantId: tid,
          oldSlug: previous.slug,
          newSlug: next.slug,
          productId: next.id,
          reason: 'slug_changed',
        })
        .onConflictDoUpdate({
          target: [productRedirects.tenantId, productRedirects.oldSlug],
          set: { newSlug: next.slug, productId: next.id, reason: 'slug_changed' },
        });
    }
    if (archived) {
      await db
        .insert(productRedirects)
        .values({
          tenantId: tid,
          oldSlug: previous.slug,
          newSlug: null,
          productId: next.id,
          reason: 'archived',
        })
        .onConflictDoNothing({ target: [productRedirects.tenantId, productRedirects.oldSlug] });
    }
  }

  return NextResponse.json({ product: next });
}

export const PATCH = PUT;

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardPermission('products', 'write');
  if (denied) return denied;
  const { id } = await params;
  const tid = tenantId(req);
  const deleted = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tid)))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: deleted[0]!.id });
}
