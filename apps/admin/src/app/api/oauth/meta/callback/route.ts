import { NextRequest, NextResponse } from 'next/server';
import { verifyState } from '../../../../../lib/oauth-crypto';
import { exchangeCode, exchangeForLongLived, fetchUser, saveMetaConnection, META_SCOPES } from '../../../../../lib/oauth/meta';

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
  const errorReason = req.nextUrl.searchParams.get('error_reason') || req.nextUrl.searchParams.get('error_description');
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (error) {
    return backTo(origin, { meta: 'error', reason: errorReason ?? error });
  }
  if (!code || !state) {
    return backTo(origin, { meta: 'error', reason: 'missing_code_or_state' });
  }

  const decoded = verifyState(state);
  if (!decoded || decoded.p !== 'meta' || !decoded.t) {
    return backTo(origin, { meta: 'error', reason: 'invalid_state' });
  }
  const ageMs = Date.now() - Number(decoded.n ?? 0);
  if (ageMs > 10 * 60_000) {
    return backTo(origin, { meta: 'error', reason: 'state_expired' });
  }

  const tenantId = String(decoded.t);
  const redirectUri = `${origin}/api/oauth/meta/callback`;

  try {
    const short = await exchangeCode(code, redirectUri);
    const long = await exchangeForLongLived(short.access_token);
    const user = await fetchUser(long.access_token);
    await saveMetaConnection({
      tenantId,
      longLivedToken: long.access_token,
      expiresIn: long.expires_in,
      user,
      scopes: META_SCOPES,
    });
    return backTo(origin, { meta: 'connected', email: user?.email ?? '' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return backTo(origin, { meta: 'error', reason: msg.slice(0, 80) });
  }
}
