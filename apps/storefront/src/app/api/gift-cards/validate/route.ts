import { NextResponse } from 'next/server';
import { db, giftCards } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/gift-cards/validate
 *
 * Body: { code: "GFT-XXXX-XXXX-XXXX" }
 * Retorna: { valid, balanceCents?, expiresAt?, status?, reason? }
 *
 * reason values:
 *   - 'not_found' | 'expired' | 'depleted' | 'inactive' | null
 */
export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, reason: 'invalid_body' }, { status: 400 });
  }

  const code = (body.code ?? '').trim().toUpperCase();
  if (!code || code.length < 8) {
    return NextResponse.json({ valid: false, reason: 'not_found' });
  }

  const [card] = await db
    .select({
      code: giftCards.code,
      currentBalanceCents: giftCards.currentBalanceCents,
      expiresAt: giftCards.expiresAt,
      status: giftCards.status,
    })
    .from(giftCards)
    .where(and(eq(giftCards.tenantId, TENANT_ID), eq(giftCards.code, code)))
    .limit(1);

  if (!card) {
    return NextResponse.json({ valid: false, reason: 'not_found' });
  }

  if (card.status !== 'active') {
    return NextResponse.json({ valid: false, reason: 'inactive', status: card.status });
  }

  if (card.currentBalanceCents <= 0) {
    return NextResponse.json({ valid: false, reason: 'depleted', balanceCents: 0 });
  }

  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired', expiresAt: card.expiresAt });
  }

  return NextResponse.json({
    valid: true,
    balanceCents: card.currentBalanceCents,
    expiresAt: card.expiresAt,
    status: card.status,
  });
}
