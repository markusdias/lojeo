import { NextResponse } from 'next/server';
import { linkIdentity } from '@lojeo/tracking/server';
import { auth } from '../../../../auth';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  let payload: { tenantId?: string; anonymousId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { tenantId, anonymousId } = payload;
  if (!tenantId || !anonymousId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  try {
    const result = await linkIdentity({ tenantId, anonymousId, userId });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ sessionsUpdated: 0, eventsUpdated: 0 }, { status: 200 });
  }
}
