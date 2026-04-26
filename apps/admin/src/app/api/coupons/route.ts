import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, coupons } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';
import { parseOrError, couponCreateSchema } from '../../../lib/validate';

export const dynamic = 'force-dynamic';

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

  const parsed = await parseOrError(req, couponCreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : null;
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;

  try {
    const [created] = await db.insert(coupons).values({
      tenantId: TENANT_ID,
      code: parsed.code,
      name: parsed.name,
      type: parsed.type,
      value: parsed.value,
      minOrderCents: parsed.minOrderCents,
      maxUses: parsed.maxUses ?? null,
      startsAt,
      endsAt,
      active: true,
    }).returning();

    await recordAuditLog({
      session,
      action: 'coupon.create',
      entityType: 'coupon',
      entityId: created?.id ?? null,
      after: {
        code: parsed.code,
        name: parsed.name,
        type: parsed.type,
        value: parsed.value,
        minOrderCents: parsed.minOrderCents,
        maxUses: parsed.maxUses ?? null,
      },
    });

    return NextResponse.json({ coupon: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_coupons_tenant_code')) {
      return NextResponse.json({ error: `code '${parsed.code}' já existe` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
