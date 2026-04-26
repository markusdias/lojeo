import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, userTwoFactor } from '@lojeo/db';
import { auth } from '../../../../auth';
import { recordAuditLog } from '../../../../lib/roles';
import { verifyTotp, verifyRecoveryCode } from '../../../../lib/totp';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'lojeo_2fa_verified';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 8; // 8h

// POST — verifica TOTP token ou recovery code da sessão atual.
// Body: { token?: string } | { recoveryCode?: string }
// Sucesso: seta cookie httpOnly secure e retorna { ok: true }.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    recoveryCode?: string;
  };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const recoveryCode = typeof body.recoveryCode === 'string' ? body.recoveryCode.trim() : '';

  if (!token && !recoveryCode) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, userId))
    .limit(1);

  if (!row || row.enabled !== 'true') {
    return NextResponse.json({ error: 'no_2fa_required' }, { status: 400 });
  }

  let verifiedVia: 'totp' | 'recovery' | null = null;

  if (token) {
    if (!verifyTotp(token, row.secret)) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }
    verifiedVia = 'totp';
  } else if (recoveryCode) {
    const hashes = Array.isArray(row.recoveryCodesHash)
      ? (row.recoveryCodesHash as string[])
      : [];
    const result = verifyRecoveryCode(recoveryCode, hashes);
    if (!result.valid) {
      return NextResponse.json({ error: 'invalid_recovery_code' }, { status: 400 });
    }
    // Consome o código (remove dos hashes)
    await db
      .update(userTwoFactor)
      .set({
        recoveryCodesHash: result.remainingHashes,
        lastUsedAt: new Date(),
      })
      .where(eq(userTwoFactor.userId, userId));

    await recordAuditLog({
      session,
      action: '2fa.recovery_used',
      entityType: 'user',
      entityId: userId,
      metadata: { remaining: result.remainingHashes.length },
    });
    verifiedVia = 'recovery';
  }

  if (verifiedVia === 'totp') {
    // Atualizar lastUsedAt mas não alterar recovery codes
    await db
      .update(userTwoFactor)
      .set({ lastUsedAt: new Date() })
      .where(eq(userTwoFactor.userId, userId));
  }

  const res = NextResponse.json({ ok: true, via: verifiedVia });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '1',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  });
  return res;
}
