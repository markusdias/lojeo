import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, coupons, calcCouponDiscountCents } from '@lojeo/db';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  type?: string;
  value?: number;
  discountCents?: number;
  freeShipping?: boolean;
  minOrderCents?: number;
  code?: string;
  stackable?: boolean;
}

export async function GET(req: Request) {
  // Rate limit: 60 validações/15min/IP — protege contra brute-force de cupons
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `coupon-validate:${ip}`, max: 60, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json<ValidateResponse>(
      { valid: false, reason: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get('code')?.trim().toUpperCase() ?? '';
  const subtotalParam = Number(searchParams.get('subtotalCents') ?? '0');
  const subtotalCents = Number.isFinite(subtotalParam) && subtotalParam > 0
    ? Math.floor(subtotalParam)
    : 0;

  if (!rawCode || rawCode.length < 2) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'invalid_code' }, { status: 400 });
  }

  const [row] = await db.select()
    .from(coupons)
    .where(and(eq(coupons.tenantId, tenantId()), eq(coupons.code, rawCode)))
    .limit(1);

  if (!row) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'not_found' });
  }

  if (!row.active) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'inactive' });
  }

  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'not_started' });
  }
  if (row.endsAt && row.endsAt.getTime() <= now) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'expired' });
  }
  if (row.maxUses !== null && row.maxUses !== undefined && row.usesCount >= row.maxUses) {
    return NextResponse.json<ValidateResponse>({ valid: false, reason: 'max_uses_reached' });
  }
  if (row.minOrderCents > 0 && subtotalCents < row.minOrderCents) {
    return NextResponse.json<ValidateResponse>({
      valid: false,
      reason: 'min_order_not_met',
      minOrderCents: row.minOrderCents,
    });
  }

  const discountCents = calcCouponDiscountCents(row.type, row.value, subtotalCents);

  return NextResponse.json<ValidateResponse>({
    valid: true,
    code: row.code,
    type: row.type,
    value: row.value,
    discountCents,
    freeShipping: row.type === 'free_shipping',
    minOrderCents: row.minOrderCents,
    stackable: row.stackable,
  });
}
