import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOKIE_NAME = 'lojeo_maintenance_bypass';
const COOKIE_MAX_AGE_SEC = 4 * 60 * 60; // 4 horas

export async function GET(req: NextRequest) {
  // Rate limit anti brute-force: 10 tentativas/min/IP
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `stamp:${ip}`, max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limit', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const token = req.nextUrl.searchParams.get('token') ?? '';
  const redirect = req.nextUrl.searchParams.get('redirect') ?? '/';

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
  }

  // Lookup token vigente via endpoint interno (usa cache 60s).
  const internalSecret = process.env.INTERNAL_API_SECRET ?? '';
  let bypassToken: string | null = null;
  try {
    const r = await fetch(`${req.nextUrl.origin}/api/internal/maintenance`, {
      headers: { 'x-internal-token': internalSecret },
      cache: 'no-store',
    });
    if (r.ok) {
      const data = (await r.json()) as { bypassToken?: string };
      bypassToken = data.bypassToken ?? null;
    }
  } catch {
    return NextResponse.json({ error: 'internal_unavailable' }, { status: 503 });
  }

  if (!bypassToken || token !== bypassToken) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
  }

  // Sanitiza redirect — só caminhos relativos no próprio host
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';

  const res = NextResponse.redirect(new URL(safeRedirect, req.nextUrl.origin), 302);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    maxAge: COOKIE_MAX_AGE_SEC,
    path: '/',
  });
  return res;
}
