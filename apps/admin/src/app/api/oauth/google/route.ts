import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../lib/roles';
import { getConnectionStatus, disconnectGoogle } from '../../../../lib/oauth/google';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const status = await getConnectionStatus(TENANT_ID);
  const oauthConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return NextResponse.json({ ...status, oauthConfigured });
}

export async function DELETE() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  await disconnectGoogle(TENANT_ID);
  return NextResponse.json({ ok: true });
}
