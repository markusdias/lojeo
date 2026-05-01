import { eq, and } from 'drizzle-orm';
import { db, tenantOauthTokens } from '@lojeo/db';
import { encryptSecret, decryptSecret } from '../oauth-crypto';

export const GOOGLE_PROVIDER = 'google';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/adwords',
];

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export function buildAuthorizeUrl(opts: { redirectUri: string; state: string; loginHint?: string }): string {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) throw new Error('AUTH_GOOGLE_ID not configured');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: opts.state,
  });
  if (opts.loginHint) params.set('login_hint', opts.loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`google_token_exchange_failed: ${err.slice(0, 200)}`);
  }
  return (await r.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`google_token_refresh_failed: ${err.slice(0, 200)}`);
  }
  return (await r.json()) as TokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<{ email?: string; sub?: string; name?: string }> {
  const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return {};
  return (await r.json()) as { email?: string; sub?: string; name?: string };
}

export async function saveGoogleConnection(opts: {
  tenantId: string;
  tokens: TokenResponse;
  accountEmail?: string;
  accountId?: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + (opts.tokens.expires_in - 60) * 1000);
  const accessEnc = encryptSecret(opts.tokens.access_token);
  const refreshEnc = opts.tokens.refresh_token ? encryptSecret(opts.tokens.refresh_token) : null;
  const scopes = opts.tokens.scope?.split(' ') ?? [];

  const existing = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, opts.tenantId), eq(tenantOauthTokens.provider, GOOGLE_PROVIDER)),
  });

  if (existing) {
    await db
      .update(tenantOauthTokens)
      .set({
        accessTokenEnc: accessEnc,
        // Google só devolve refresh_token na primeira autorização — preservar o anterior se ausente
        refreshTokenEnc: refreshEnc ?? existing.refreshTokenEnc,
        expiresAt,
        scopes,
        accountEmail: opts.accountEmail ?? existing.accountEmail,
        accountId: opts.accountId ?? existing.accountId,
        updatedAt: new Date(),
      })
      .where(eq(tenantOauthTokens.id, existing.id));
  } else {
    await db.insert(tenantOauthTokens).values({
      tenantId: opts.tenantId,
      provider: GOOGLE_PROVIDER,
      accessTokenEnc: accessEnc,
      refreshTokenEnc: refreshEnc,
      expiresAt,
      scopes,
      accountEmail: opts.accountEmail,
      accountId: opts.accountId,
    });
  }
}

/**
 * Retorna access_token válido pro tenant. Faz refresh automático se expirado.
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, GOOGLE_PROVIDER)),
  });
  if (!row) return null;

  const now = Date.now();
  const expiresMs = row.expiresAt ? new Date(row.expiresAt).getTime() : 0;
  if (expiresMs > now + 30_000) {
    return decryptSecret(row.accessTokenEnc);
  }

  if (!row.refreshTokenEnc) return null;
  const refreshed = await refreshAccessToken(decryptSecret(row.refreshTokenEnc));
  await saveGoogleConnection({ tenantId, tokens: refreshed });
  return refreshed.access_token;
}

export async function disconnectGoogle(tenantId: string): Promise<void> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, GOOGLE_PROVIDER)),
  });
  if (row?.refreshTokenEnc) {
    // Revoke do lado Google — best effort
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptSecret(row.refreshTokenEnc))}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // ignora — local delete continua
    }
  }
  await db
    .delete(tenantOauthTokens)
    .where(and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, GOOGLE_PROVIDER)));
}

export async function getConnectionStatus(tenantId: string): Promise<{
  connected: boolean;
  accountEmail?: string;
  scopes?: string[];
  expiresAt?: string;
} | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, GOOGLE_PROVIDER)),
  });
  if (!row) return { connected: false };
  return {
    connected: true,
    accountEmail: row.accountEmail ?? undefined,
    scopes: (row.scopes as string[]) ?? [],
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : undefined,
  };
}
