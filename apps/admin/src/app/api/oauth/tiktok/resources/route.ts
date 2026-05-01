import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';
import { getValidAccessToken, fetchAdvertisers, fetchPixels } from '../../../../../lib/oauth/tiktok';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const conn = await getValidAccessToken(TENANT_ID);
  if (!conn) {
    return NextResponse.json({ error: 'not_connected', message: 'Conecte o TikTok primeiro' }, { status: 400 });
  }

  const advs = await fetchAdvertisers(conn.token, conn.advertiserIds);
  const px = await fetchPixels(conn.token, advs.items);

  return NextResponse.json({
    advertisers: advs.items,
    pixels: px.items,
    errors: {
      ...(advs.error ? { advertisers: advs.error } : {}),
      ...(px.error ? { pixels: px.error } : {}),
    },
  });
}
