import { NextRequest, NextResponse } from 'next/server';
import { db, giftCards } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateGiftCode } from './code';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const MOCK_PAYMENT = (process.env.GIFT_CARD_MOCK_PAYMENT ?? 'true').toLowerCase() !== 'false';

const purchaseSchema = z.object({
  valueCents: z.number().int().min(5000).max(500000),
  recipientEmail: z.string().email().max(300),
  recipientName: z.string().trim().max(200).optional(),
  senderName: z.string().trim().max(200).optional(),
  message: z.string().trim().max(500).optional(),
  expiresInDays: z.number().int().min(30).max(365 * 2).default(365),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);

  // Mock payment mode (dev/staging sem MP): card já nasce active. Em prod com MP,
  // status nasceria 'pending_payment' e webhook do gateway promove para 'active'.
  const status = MOCK_PAYMENT ? 'active' : 'pending_payment';
  const balance = MOCK_PAYMENT ? data.valueCents : 0;

  // Retry até 3x em caso de colisão de code
  let attempt = 0;
  let inserted: typeof giftCards.$inferSelect | null = null;
  while (attempt < 3 && !inserted) {
    attempt++;
    const code = generateGiftCode();
    try {
      const [row] = await db
        .insert(giftCards)
        .values({
          tenantId: TENANT_ID,
          code,
          initialValueCents: data.valueCents,
          currentBalanceCents: balance,
          expiresAt,
          status,
          recipientEmail: data.recipientEmail,
          recipientName: data.recipientName ?? null,
          senderName: data.senderName ?? null,
          message: data.message ?? null,
        })
        .returning();
      inserted = row ?? null;
    } catch (err) {
      // Code collision (UNIQUE) — retry; outro erro propaga
      if (attempt >= 3) {
        return NextResponse.json(
          { error: 'persistence_failed', detail: String(err) },
          { status: 500 }
        );
      }
    }
  }

  if (!inserted) {
    return NextResponse.json({ error: 'code_collision_retries_exhausted' }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    code: inserted.code,
    valueCents: inserted.initialValueCents,
    status: inserted.status,
    expiresAt: inserted.expiresAt,
    mockPayment: MOCK_PAYMENT,
  });
}

// GET ?code=GIFT-XXXX-YYYY → valida saldo (público para checkout)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code || code.length < 8) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
  }
  const row = await db.query.giftCards.findFirst({
    where: and(eq(giftCards.tenantId, TENANT_ID), eq(giftCards.code, code)),
  });
  if (!row) return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 });
  if (row.status !== 'active') {
    return NextResponse.json({ valid: false, reason: `status_${row.status}` }, { status: 200 });
  }
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' }, { status: 200 });
  }
  if ((row.currentBalanceCents ?? 0) <= 0) {
    return NextResponse.json({ valid: false, reason: 'no_balance' }, { status: 200 });
  }
  return NextResponse.json({
    valid: true,
    balanceCents: row.currentBalanceCents,
    expiresAt: row.expiresAt,
  });
}
