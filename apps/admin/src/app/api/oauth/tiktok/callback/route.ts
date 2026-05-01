import { NextRequest, NextResponse } from 'next/server';
import { verifyState } from '../../../../../lib/oauth-crypto';
import { exchangeCode, saveTikTokConnection } from '../../../../../lib/oauth/tiktok';

export const dynamic = 'force-dynamic';

function backTo(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL('/settings', origin);
  url.hash = 'pixels';
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  // TikTok manda parâmetros como `auth_code` (não `code`) em alguns fluxos. Cobrir ambos.
  const code = req.nextUrl.searchParams.get('auth_code') ?? req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error') ?? req.nextUrl.searchParams.get('error_description');

  if (error) return backTo(origin, { tiktok: 'error', reason: error });
  if (!code || !state) return backTo(origin, { tiktok: 'error', reason: 'missing_code_or_state' });

  const decoded = verifyState(state);
  if (!decoded || decoded.p !== 'tiktok' || !decoded.t) {
    return backTo(origin, { tiktok: 'error', reason: 'invalid_state' });
  }
  const ageMs = Date.now() - Number(decoded.n ?? 0);
  if (ageMs > 10 * 60_000) return backTo(origin, { tiktok: 'error', reason: 'state_expired' });

  const tenantId = String(decoded.t);
  try {
    const tok = await exchangeCode(code);
    await saveTikTokConnection({
      tenantId,
      accessToken: tok.data.access_token,
      advertiserIds: tok.data.advertiser_ids ?? [],
    });
    return backTo(origin, { tiktok: 'connected' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return backTo(origin, { tiktok: 'error', reason: msg.slice(0, 80) });
  }
}
