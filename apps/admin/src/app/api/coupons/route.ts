import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, coupons, COUPON_TYPES } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

interface CreateBody {
  code?: string;
  name?: string;
  type?: string;
  value?: number;
  minOrderCents?: number;
  maxUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
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

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db.select()
    .from(coupons)
    .where(eq(coupons.tenantId, TENANT_ID))
    .orderBy(desc(coupons.createdAt));

  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody;

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim();
  const type = body.type?.trim();

  if (!code || !/^[A-Z0-9_-]{2,60}$/.test(code)) {
    return NextResponse.json({ error: 'code obrigatório (A-Z, 0-9, _-, 2..60 chars)' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
  }
  if (!type || !(COUPON_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `type inválido (use ${COUPON_TYPES.join(' | ')})` }, { status: 400 });
  }

  const value = Number(body.value ?? 0);
  const valueErr = validateValueForType(type, value);
  if (valueErr) return NextResponse.json({ error: valueErr }, { status: 400 });

  const minOrderCents = Number(body.minOrderCents ?? 0);
  if (!Number.isFinite(minOrderCents) || minOrderCents < 0) {
    return NextResponse.json({ error: 'minOrderCents inválido' }, { status: 400 });
  }

  let maxUses: number | null = null;
  if (body.maxUses !== undefined && body.maxUses !== null) {
    const n = Number(body.maxUses);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: 'maxUses deve ser >= 1 ou null' }, { status: 400 });
    }
    maxUses = Math.floor(n);
  }

  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return NextResponse.json({ error: 'endsAt deve ser posterior a startsAt' }, { status: 400 });
  }

  try {
    const [created] = await db.insert(coupons).values({
      tenantId: TENANT_ID,
      code,
      name,
      type,
      value: Math.floor(value),
      minOrderCents: Math.floor(minOrderCents),
      maxUses,
      startsAt,
      endsAt,
      active: true,
    }).returning();

    await recordAuditLog({
      session,
      action: 'coupon.create',
      entityType: 'coupon',
      entityId: created?.id ?? null,
      after: { code, name, type, value, minOrderCents, maxUses },
    });

    return NextResponse.json({ coupon: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_coupons_tenant_code')) {
      return NextResponse.json({ error: `code '${code}' já existe` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
