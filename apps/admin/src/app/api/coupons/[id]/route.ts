import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, coupons } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';
import { parseOrError, couponPatchSchema } from '../../../../lib/validate';

export const dynamic = 'force-dynamic';

function parseDateField(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseOrError(req, couponPatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const [existing] = await db.select()
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.type !== undefined) updates.type = parsed.type;
  if (parsed.value !== undefined) updates.value = parsed.value;
  if (parsed.minOrderCents !== undefined) updates.minOrderCents = parsed.minOrderCents;

  if (parsed.maxUses !== undefined) {
    if (parsed.maxUses !== null && parsed.maxUses < existing.usesCount) {
      return NextResponse.json(
        { error: `maxUses não pode ser menor que usesCount (${existing.usesCount})` },
        { status: 400 },
      );
    }
    updates.maxUses = parsed.maxUses;
  }

  const startsAt = parseDateField(parsed.startsAt);
  if (startsAt !== undefined) updates.startsAt = startsAt;
  const endsAt = parseDateField(parsed.endsAt);
  if (endsAt !== undefined) updates.endsAt = endsAt;

  // valida sequência efetiva (combina updates com existente)
  const finalStarts = updates.startsAt !== undefined ? (updates.startsAt as Date | null) : existing.startsAt;
  const finalEnds = updates.endsAt !== undefined ? (updates.endsAt as Date | null) : existing.endsAt;
  if (finalStarts && finalEnds && finalEnds.getTime() <= finalStarts.getTime()) {
    return NextResponse.json({ error: 'endsAt deve ser posterior a startsAt' }, { status: 400 });
  }

  if (parsed.active !== undefined) updates.active = parsed.active;
  if (parsed.stackable !== undefined) updates.stackable = parsed.stackable;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ coupon: existing });
  }

  updates.updatedAt = new Date();

  try {
    const [updated] = await db.update(coupons)
      .set(updates)
      .where(and(eq(coupons.id, id), eq(coupons.tenantId, TENANT_ID)))
      .returning();

    const isDisable = updates.active === false && existing.active === true;
    await recordAuditLog({
      session,
      action: isDisable ? 'coupon.disable' : 'coupon.update',
      entityType: 'coupon',
      entityId: id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ coupon: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db.select()
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Soft-delete — preserva histórico de orders.coupon_code
  const [updated] = await db.update(coupons)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, TENANT_ID)))
    .returning();

  await recordAuditLog({
    session,
    action: 'coupon.disable',
    entityType: 'coupon',
    entityId: id,
    before: existing,
    after: updated,
  });

  return NextResponse.json({ coupon: updated });
}
