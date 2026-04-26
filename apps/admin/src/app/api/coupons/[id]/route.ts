import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, coupons, COUPON_TYPES } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface PatchBody {
  name?: string;
  type?: string;
  value?: number;
  minOrderCents?: number;
  maxUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
}

function parseDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function validateValueForType(type: string, value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return 'value deve ser inteiro';
  if (type === 'percent') {
    if (value < 1 || value > 100) return 'percent: value deve estar entre 1 e 100';
  } else if (type === 'fixed') {
    if (value < 1) return 'fixed: value (cents) deve ser >= 1';
  } else if (type === 'free_shipping') {
    if (value !== 0) return 'free_shipping: value deve ser 0';
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const [existing] = await db.select()
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: 'name não pode ser vazio' }, { status: 400 });
    updates.name = name;
  }

  let effectiveType = existing.type;
  if (body.type !== undefined) {
    if (!(COUPON_TYPES as readonly string[]).includes(body.type)) {
      return NextResponse.json({ error: `type inválido (use ${COUPON_TYPES.join(' | ')})` }, { status: 400 });
    }
    effectiveType = body.type;
    updates.type = body.type;
  }

  if (body.value !== undefined) {
    const value = Number(body.value);
    const err = validateValueForType(effectiveType, value);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    updates.value = Math.floor(value);
  } else if (body.type !== undefined) {
    const err = validateValueForType(effectiveType, existing.value);
    if (err) return NextResponse.json({ error: `value atual incompatível com novo type: ${err}` }, { status: 400 });
  }

  if (body.minOrderCents !== undefined) {
    const n = Number(body.minOrderCents);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: 'minOrderCents inválido' }, { status: 400 });
    }
    updates.minOrderCents = Math.floor(n);
  }

  if (body.maxUses !== undefined) {
    if (body.maxUses === null) {
      updates.maxUses = null;
    } else {
      const n = Number(body.maxUses);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: 'maxUses deve ser >= 1 ou null' }, { status: 400 });
      }
      if (n < existing.usesCount) {
        return NextResponse.json({ error: `maxUses não pode ser menor que usesCount (${existing.usesCount})` }, { status: 400 });
      }
      updates.maxUses = Math.floor(n);
    }
  }

  const startsAt = parseDate(body.startsAt);
  if (startsAt !== undefined) updates.startsAt = startsAt;
  const endsAt = parseDate(body.endsAt);
  if (endsAt !== undefined) updates.endsAt = endsAt;

  const finalStarts = (updates.startsAt as Date | null | undefined) !== undefined
    ? (updates.startsAt as Date | null)
    : existing.startsAt;
  const finalEnds = (updates.endsAt as Date | null | undefined) !== undefined
    ? (updates.endsAt as Date | null)
    : existing.endsAt;
  if (finalStarts && finalEnds && finalEnds.getTime() <= finalStarts.getTime()) {
    return NextResponse.json({ error: 'endsAt deve ser posterior a startsAt' }, { status: 400 });
  }

  if (body.active !== undefined) {
    updates.active = !!body.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ coupon: existing });
  }

  // usesCount é imutável via PATCH — sempre forçamos updatedAt
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
