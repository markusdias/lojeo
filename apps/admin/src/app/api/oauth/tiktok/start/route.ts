import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';
import { signState } from '../../../../../lib/oauth-crypto';
import { buildAuthorizeUrl } from '../../../../../lib/oauth/tiktok';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  if (!process.env.TIKTOK_APP_ID || !process.env.TIKTOK_APP_SECRET) {
    return NextResponse.json(
      { error: 'tiktok_oauth_not_configured', hint: 'Defina TIKTOK_APP_ID e TIKTOK_APP_SECRET no servidor' },
      { status: 503 },
    );
  }
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/oauth/tiktok/callback`;
  const state = signState({ t: TENANT_ID, n: Date.now(), p: 'tiktok' });
  return NextResponse.redirect(buildAuthorizeUrl({ redirectUri, state }));
}
