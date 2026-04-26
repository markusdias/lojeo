import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push-subscriptions — registra subscription PWA push (stub v1).
 *
 * Sem VAPID env: 503 unavailable. Cliente pode subscrever localmente
 * mas server não envia. Persistência DB + envio real via web-push lib
 * entram Sprint 13 v2 quando VAPID keys forem configuradas.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({
      error: 'push_unavailable',
      message: 'VAPID keys não configuradas. Subscription registrada localmente mas server não enviará.',
    }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sub = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  logger.info({
    userId,
    endpoint: sub.endpoint.slice(0, 50) + '...',
    hasP256dh: Boolean(sub.keys.p256dh),
    hasAuth: Boolean(sub.keys.auth),
  }, 'push subscription registered (stub)');

  return NextResponse.json({ ok: true, persistedInDb: false });
}

/**
 * GET — retorna VAPID public key.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  if (!publicKey) {
    return NextResponse.json({ error: 'vapid_not_configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
