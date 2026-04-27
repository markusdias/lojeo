import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, pushSubscriptions } from '@lojeo/db';
import { auth } from '../../../auth';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/push-subscriptions — retorna VAPID public key se configurada.
 * 503 se ausente.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  if (!publicKey) {
    return NextResponse.json({ error: 'vapid_not_configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}

/**
 * POST /api/push-subscriptions — registra subscription PWA push (stub v1).
 *
 * Persiste em push_subscriptions (idempotente por endpoint). Sem provider real
 * (FCM/web-push), o envio é apenas logado quando algo tentar disparar.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string }, userId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const tid = TENANT_ID();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sub = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    // Idempotente: se endpoint já existe, atualiza chaves/userId; senão insere.
    const [existing] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint))
      .limit(1);

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          keysP256dh: sub.keys.p256dh,
          keysAuth: sub.keys.auth,
          userId,
          userAgent,
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      await db.insert(pushSubscriptions).values({
        tenantId: tid,
        userId,
        endpoint: sub.endpoint,
        keysP256dh: sub.keys.p256dh,
        keysAuth: sub.keys.auth,
        userAgent,
      });
    }

    logger.info(
      {
        userId,
        endpoint: sub.endpoint.slice(0, 60) + '...',
        vapidConfigured: Boolean(process.env.VAPID_PRIVATE_KEY),
      },
      'push subscription persisted (stub)',
    );

    return NextResponse.json({
      ok: true,
      persistedInDb: true,
      pushProviderConfigured: Boolean(process.env.VAPID_PRIVATE_KEY),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg }, 'push subscription persist failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/push-subscriptions?endpoint=... — remove subscription por endpoint.
 *
 * Body alternativo: { endpoint } (alguns clients não suportam querystring no DELETE).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const tid = TENANT_ID();

  let endpoint: string | null = req.nextUrl.searchParams.get('endpoint');
  if (!endpoint) {
    try {
      const body = await req.json().catch(() => null) as { endpoint?: string } | null;
      endpoint = body?.endpoint ?? null;
    } catch {
      endpoint = null;
    }
  }
  if (!endpoint) return NextResponse.json({ error: 'endpoint obrigatório' }, { status: 400 });

  try {
    const conditions = userId
      ? and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.tenantId, tid))
      : and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.tenantId, tid));
    await db.delete(pushSubscriptions).where(conditions);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
