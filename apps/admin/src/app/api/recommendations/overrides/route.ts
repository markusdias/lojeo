import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db, recommendationOverrides, products } from '@lojeo/db';
import { guardPermission } from '../../../../lib/permission-guard';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  const headerTenant = req.headers.get('x-tenant-id');
  return headerTenant ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

const UuidSchema = z.string().uuid();

const CreateSchema = z.object({
  productId: z.string().uuid(),
  recommendedProductId: z.string().uuid(),
  overrideType: z.enum(['pin', 'exclude']),
});

// GET ?productId=X — lista overrides do produto fonte com snapshot do alvo (nome/slug)
export async function GET(req: NextRequest) {
  const denied = await guardPermission('products', 'read');
  if (denied) return denied;
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  if (!productId || !UuidSchema.safeParse(productId).success) {
    return NextResponse.json({ error: 'productId required (uuid)' }, { status: 400 });
  }
  const tid = tenantId(req);

  const rows = await db
    .select()
    .from(recommendationOverrides)
    .where(
      and(
        eq(recommendationOverrides.tenantId, tid),
        eq(recommendationOverrides.productId, productId),
      ),
    )
    .orderBy(desc(recommendationOverrides.createdAt));

  // Hidrata nome/slug do produto recomendado para mostrar na UI
  const targetIds = rows.map((r) => r.recommendedProductId);
  const targets = targetIds.length
    ? await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          status: products.status,
        })
        .from(products)
        .where(and(eq(products.tenantId, tid), inArray(products.id, targetIds)))
    : [];
  const byId = new Map(targets.map((t) => [t.id, t]));

  const overrides = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    recommendedProductId: r.recommendedProductId,
    overrideType: r.overrideType,
    createdAt: r.createdAt,
    target: byId.get(r.recommendedProductId) ?? null,
  }));

  return NextResponse.json({ overrides });
}

// POST { productId, recommendedProductId, overrideType } — upsert por (tenant, product, target)
export async function POST(req: NextRequest) {
  const denied = await guardPermission('products', 'write');
  if (denied) return denied;
  const tid = tenantId(req);
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { productId, recommendedProductId, overrideType } = parsed.data;

  if (productId === recommendedProductId) {
    return NextResponse.json(
      { error: 'productId e recommendedProductId não podem ser iguais' },
      { status: 400 },
    );
  }

  // Confere que ambos os produtos existem e pertencem ao tenant
  const found = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tid),
        inArray(products.id, [productId, recommendedProductId]),
      ),
    );
  if (found.length < 2) {
    return NextResponse.json({ error: 'produto não encontrado neste tenant' }, { status: 404 });
  }

  const existing = await db
    .select()
    .from(recommendationOverrides)
    .where(
      and(
        eq(recommendationOverrides.tenantId, tid),
        eq(recommendationOverrides.productId, productId),
        eq(recommendationOverrides.recommendedProductId, recommendedProductId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const updated = await db
      .update(recommendationOverrides)
      .set({ overrideType, updatedAt: new Date() })
      .where(eq(recommendationOverrides.id, existing[0].id))
      .returning();
    return NextResponse.json({ override: updated[0] });
  }

  const inserted = await db
    .insert(recommendationOverrides)
    .values({
      tenantId: tid,
      productId,
      recommendedProductId,
      overrideType,
    })
    .returning();

  return NextResponse.json({ override: inserted[0] }, { status: 201 });
}

// DELETE ?id=X — remove override (escopado por tenant)
export async function DELETE(req: NextRequest) {
  const denied = await guardPermission('products', 'write');
  if (denied) return denied;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id || !UuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'id required (uuid)' }, { status: 400 });
  }
  const tid = tenantId(req);

  const deleted = await db
    .delete(recommendationOverrides)
    .where(
      and(
        eq(recommendationOverrides.id, id),
        eq(recommendationOverrides.tenantId, tid),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
