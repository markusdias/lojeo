import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, restockNotifications } from '@lojeo/db';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const RestockSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  email: z.string().email().max(300),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = RestockSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `restock:${parsed.data.email.toLowerCase()}:${ip}`,
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  try {
    await db.insert(restockNotifications).values({
      tenantId: tenantId(),
      email: parsed.data.email,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/restock-notify]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
