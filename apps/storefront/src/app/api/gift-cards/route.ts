import { NextResponse } from 'next/server';
import { db, giftCards } from '@lojeo/db';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const ALLOWED_VALUES_CENTS = [10000, 20000, 50000, 100000];
const MIN_CUSTOM_CENTS = 5000; // R$ 50
const MAX_CUSTOM_CENTS = 500000; // R$ 5.000

interface PostBody {
  amountCents?: number;
  recipientEmail?: string;
  recipientName?: string;
  buyerMessage?: string;
  deliveryDate?: string | null;
}

interface PostResponse {
  ok: boolean;
  code?: string;
  balanceCents?: number;
  expiresAt?: string;
  error?: string;
}

// GFT-XXXX-XXXX-XXXX (12 chars hex, base32-like)
function generateCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
  const part = (n: number) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
  };
  return `GFT-${part(4)}-${part(4)}-${part(4)}`;
}

export async function POST(req: Request) {
  // Rate limit: 10 requisições / 10 min / IP — anti abuso de geração
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `gift-card-create:${ip}`, max: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json<PostResponse>(
      { ok: false, error: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json<PostResponse>({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const amount = Number(body.amountCents);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json<PostResponse>({ ok: false, error: 'amount_required' }, { status: 400 });
  }

  const isPredefined = ALLOWED_VALUES_CENTS.includes(amount);
  const isValidCustom = amount >= MIN_CUSTOM_CENTS && amount <= MAX_CUSTOM_CENTS;
  if (!isPredefined && !isValidCustom) {
    return NextResponse.json<PostResponse>(
      { ok: false, error: 'amount_out_of_range' },
      { status: 400 },
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipientEmail = (body.recipientEmail ?? '').trim();
  if (!emailRegex.test(recipientEmail)) {
    return NextResponse.json<PostResponse>({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  // 12 meses de validade
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  // Tenta inserir até 3 vezes em caso de colisão de código (extremamente raro)
  let code = generateCode();
  let inserted = false;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    try {
      await db.insert(giftCards).values({
        tenantId: TENANT_ID(),
        code,
        initialValueCents: amount,
        currentBalanceCents: amount,
        expiresAt,
        status: 'active',
        recipientEmail,
      });
      inserted = true;
    } catch (e) {
      lastErr = e;
      code = generateCode();
    }
  }

  if (!inserted) {
    console.error('[POST /api/gift-cards] insert failed', lastErr);
    return NextResponse.json<PostResponse>({ ok: false, error: 'internal_error' }, { status: 500 });
  }

  // Email real bloqueado nesta fase (Resend pendente). Log + retorna code ao buyer.
  console.warn('[gift-cards] email entrega não enviado (Resend não configurado)', {
    code,
    recipientEmail,
    recipientName: body.recipientName,
    deliveryDate: body.deliveryDate ?? null,
  });

  return NextResponse.json<PostResponse>(
    {
      ok: true,
      code,
      balanceCents: amount,
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201 },
  );
}
