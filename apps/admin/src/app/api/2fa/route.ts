import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, userTwoFactor } from '@lojeo/db';
import { auth } from '../../../auth';
import { recordAuditLog } from '../../../lib/roles';
import {
  generateSecret,
  buildOtpAuthUrl,
  buildQrPng,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '../../../lib/totp';

export const dynamic = 'force-dynamic';

// GET — status do 2FA do user atual
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [row] = await db.select().from(userTwoFactor).where(eq(userTwoFactor.userId, userId)).limit(1);
  return NextResponse.json({
    enabled: row?.enabled === 'true',
    enabledAt: row?.enabledAt ?? null,
    lastUsedAt: row?.lastUsedAt ?? null,
    recoveryCodesRemaining: Array.isArray(row?.recoveryCodesHash) ? row.recoveryCodesHash.length : 0,
  });
}

// POST — start setup: gera secret + QR (NÃO habilita ainda)
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Sempre gera novo secret no setup (anula tentativas anteriores)
  const secret = generateSecret();
  const otpauthUrl = buildOtpAuthUrl(email, secret);
  const qr = await buildQrPng(otpauthUrl);

  await db.insert(userTwoFactor).values({
    userId,
    secret,
    enabled: 'false',
    recoveryCodesHash: [],
  }).onConflictDoUpdate({
    target: userTwoFactor.userId,
    set: { secret, enabled: 'false', recoveryCodesHash: [], enabledAt: null },
  });

  return NextResponse.json({ qr, otpauthUrl, secret });
}

// PATCH — verifica token + habilita + retorna recovery codes (uma única vez)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { token?: string };
  const token = body.token?.trim() ?? '';

  const [row] = await db.select().from(userTwoFactor).where(eq(userTwoFactor.userId, userId)).limit(1);
  if (!row) return NextResponse.json({ error: 'setup_first' }, { status: 400 });

  if (!verifyTotp(token, row.secret)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes(10);
  const recoveryCodesHash = recoveryCodes.map(hashRecoveryCode);
  const now = new Date();

  await db.update(userTwoFactor)
    .set({
      enabled: 'true',
      enabledAt: now,
      lastUsedAt: now,
      recoveryCodesHash,
    })
    .where(eq(userTwoFactor.userId, userId));

  await recordAuditLog({
    session,
    action: '2fa.enable',
    entityType: 'user',
    entityId: userId,
  });

  // Recovery codes só retornados uma vez
  return NextResponse.json({ enabled: true, recoveryCodes });
}

// DELETE — desabilita 2FA (requer confirmação via token TOTP)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { token?: string };
  const token = body.token?.trim() ?? '';

  const [row] = await db.select().from(userTwoFactor).where(eq(userTwoFactor.userId, userId)).limit(1);
  if (!row || row.enabled !== 'true') return NextResponse.json({ error: 'not_enabled' }, { status: 400 });

  if (!verifyTotp(token, row.secret)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  await db.delete(userTwoFactor).where(eq(userTwoFactor.userId, userId));

  await recordAuditLog({
    session,
    action: '2fa.disable',
    entityType: 'user',
    entityId: userId,
  });

  return NextResponse.json({ enabled: false });
}
