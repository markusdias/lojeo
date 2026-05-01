import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';
import { signState } from '../../../../../lib/oauth-crypto';
import { buildAuthorizeUrl } from '../../../../../lib/oauth/google';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'google_oauth_not_configured', hint: 'Defina AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET no servidor' },
      { status: 503 },
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/oauth/google/callback`;

  const state = signState({
    t: TENANT_ID,
    n: Date.now(),
    p: 'google',
  });

  const url = buildAuthorizeUrl({ redirectUri, state });
  return NextResponse.redirect(url);
}
