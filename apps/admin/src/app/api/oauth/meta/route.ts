import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../lib/roles';
import { getConnectionStatus, disconnectMeta } from '../../../../lib/oauth/meta';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const status = await getConnectionStatus(TENANT_ID);
  const oauthConfigured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
  return NextResponse.json({ ...status, oauthConfigured });
}

export async function DELETE() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  await disconnectMeta(TENANT_ID);
  return NextResponse.json({ ok: true });
}
