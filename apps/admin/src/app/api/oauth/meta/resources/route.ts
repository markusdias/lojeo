import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';
import { getValidAccessToken, fetchPixels, fetchAdAccounts } from '../../../../../lib/oauth/meta';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const token = await getValidAccessToken(TENANT_ID);
  if (!token) {
    return NextResponse.json({ error: 'not_connected', message: 'Conecte o Meta primeiro' }, { status: 400 });
  }

  const [px, ads] = await Promise.all([fetchPixels(token), fetchAdAccounts(token)]);
  return NextResponse.json({
    pixels: px.pixels,
    adAccounts: ads.accounts,
    errors: {
      ...(px.error ? { pixels: px.error } : {}),
      ...(ads.error ? { adAccounts: ads.error } : {}),
    },
  });
}
