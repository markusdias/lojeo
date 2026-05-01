import { NextRequest, NextResponse } from 'next/server';
import { verifyState } from '../../../../../lib/oauth-crypto';
import { exchangeCode, fetchUserInfo, saveGoogleConnection } from '../../../../../lib/oauth/google';

export const dynamic = 'force-dynamic';

function backTo(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL('/settings', origin);
  url.hash = 'pixels';
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get('error');
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (error) {
    return backTo(origin, { google: 'error', reason: error });
  }
  if (!code || !state) {
    return backTo(origin, { google: 'error', reason: 'missing_code_or_state' });
  }

  const decoded = verifyState(state);
  if (!decoded || decoded.p !== 'google' || !decoded.t) {
    return backTo(origin, { google: 'error', reason: 'invalid_state' });
  }

  const ageMs = Date.now() - Number(decoded.n ?? 0);
  if (ageMs > 10 * 60_000) {
    return backTo(origin, { google: 'error', reason: 'state_expired' });
  }

  const tenantId = String(decoded.t);
  const redirectUri = `${origin}/api/oauth/google/callback`;

  try {
    const tokens = await exchangeCode(code, redirectUri);
    const profile = await fetchUserInfo(tokens.access_token);
    await saveGoogleConnection({
      tenantId,
      tokens,
      accountEmail: profile.email,
      accountId: profile.sub,
    });
    return backTo(origin, { google: 'connected', email: profile.email ?? '' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return backTo(origin, { google: 'error', reason: msg.slice(0, 80) });
  }
}
