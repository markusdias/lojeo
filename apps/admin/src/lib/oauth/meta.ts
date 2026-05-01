import { eq, and } from 'drizzle-orm';
import { db, tenantOauthTokens } from '@lojeo/db';
import { encryptSecret, decryptSecret } from '../oauth-crypto';

export const META_PROVIDER = 'meta';
const GRAPH_VERSION = 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_SCOPES = [
  'public_profile',
  'email',
  'business_management',
  'ads_read',
  'ads_management',
];

interface ShortTokenResponse { access_token: string; token_type: string; expires_in?: number }
interface LongTokenResponse { access_token: string; token_type: string; expires_in: number }

export function buildAuthorizeUrl(opts: { redirectUri: string; state: string }): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error('META_APP_ID not configured');
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    response_type: 'code',
    scope: META_SCOPES.join(','),
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<ShortTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error('Meta OAuth credentials missing');
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const r = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`meta_token_exchange_failed: ${err.slice(0, 200)}`);
  }
  return (await r.json()) as ShortTokenResponse;
}

async function exchangeForLongLived(shortToken: string): Promise<LongTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error('Meta OAuth credentials missing');
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const r = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`meta_long_lived_failed: ${err.slice(0, 200)}`);
  }
  return (await r.json()) as LongTokenResponse;
}

interface MetaUser { id: string; name?: string; email?: string }

export async function fetchUser(accessToken: string): Promise<MetaUser | null> {
  const r = await fetch(`${GRAPH_BASE}/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
  if (!r.ok) return null;
  return (await r.json()) as MetaUser;
}

export interface MetaPixel {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
  lastFiredTime?: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  accountStatus?: number;
  businessId?: string;
}

export async function fetchPixels(accessToken: string): Promise<{ pixels: MetaPixel[]; error?: string }> {
  const bizRes = await fetch(
    `${GRAPH_BASE}/me/businesses?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!bizRes.ok) {
    return { pixels: [], error: `HTTP ${bizRes.status}` };
  }
  const bizData = (await bizRes.json()) as { data?: Array<{ id: string; name: string }> };
  const pixels: MetaPixel[] = [];
  for (const biz of bizData.data ?? []) {
    const pxRes = await fetch(
      `${GRAPH_BASE}/${biz.id}/owned_pixels?fields=id,name,last_fired_time&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!pxRes.ok) continue;
    const pxData = (await pxRes.json()) as {
      data?: Array<{ id: string; name: string; last_fired_time?: string }>;
    };
    for (const p of pxData.data ?? []) {
      pixels.push({
        id: p.id,
        name: p.name,
        businessId: biz.id,
        businessName: biz.name,
        lastFiredTime: p.last_fired_time,
      });
    }
  }
  return { pixels };
}

export async function fetchAdAccounts(accessToken: string): Promise<{ accounts: MetaAdAccount[]; error?: string }> {
  const r = await fetch(
    `${GRAPH_BASE}/me/adaccounts?fields=id,name,account_status,business&limit=200&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!r.ok) return { accounts: [], error: `HTTP ${r.status}` };
  const data = (await r.json()) as {
    data?: Array<{ id: string; name: string; account_status?: number; business?: { id: string } }>;
  };
  return {
    accounts: (data.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      accountStatus: a.account_status,
      businessId: a.business?.id,
    })),
  };
}

export async function saveMetaConnection(opts: {
  tenantId: string;
  longLivedToken: string;
  expiresIn: number;
  user?: MetaUser | null;
  scopes: string[];
}): Promise<void> {
  const expiresAt = new Date(Date.now() + (opts.expiresIn - 60) * 1000);
  const enc = encryptSecret(opts.longLivedToken);

  const existing = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, opts.tenantId), eq(tenantOauthTokens.provider, META_PROVIDER)),
  });

  if (existing) {
    await db
      .update(tenantOauthTokens)
      .set({
        accessTokenEnc: enc,
        refreshTokenEnc: null,
        expiresAt,
        scopes: opts.scopes,
        accountEmail: opts.user?.email ?? existing.accountEmail,
        accountId: opts.user?.id ?? existing.accountId,
        metadata: { name: opts.user?.name ?? null },
        updatedAt: new Date(),
      })
      .where(eq(tenantOauthTokens.id, existing.id));
  } else {
    await db.insert(tenantOauthTokens).values({
      tenantId: opts.tenantId,
      provider: META_PROVIDER,
      accessTokenEnc: enc,
      expiresAt,
      scopes: opts.scopes,
      accountEmail: opts.user?.email,
      accountId: opts.user?.id,
      metadata: { name: opts.user?.name ?? null },
    });
  }
}

/**
 * Retorna access_token válido. Meta não tem refresh_token — long-lived expira em 60d.
 * Se faltar <7d pra expirar, troca por outro long-lived antes (rolling refresh).
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, META_PROVIDER)),
  });
  if (!row) return null;

  const now = Date.now();
  const expiresMs = row.expiresAt ? new Date(row.expiresAt).getTime() : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (expiresMs <= now) return null;

  const current = decryptSecret(row.accessTokenEnc);
  if (expiresMs - now < sevenDays) {
    try {
      const refreshed = await exchangeForLongLived(current);
      await saveMetaConnection({
        tenantId,
        longLivedToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
        scopes: (row.scopes as string[]) ?? [],
      });
      return refreshed.access_token;
    } catch {
      return current;
    }
  }
  return current;
}

export async function disconnectMeta(tenantId: string): Promise<void> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, META_PROVIDER)),
  });
  if (row) {
    try {
      const token = decryptSecret(row.accessTokenEnc);
      await fetch(`${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    } catch {
      // best effort
    }
  }
  await db
    .delete(tenantOauthTokens)
    .where(and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, META_PROVIDER)));
}

export async function getConnectionStatus(tenantId: string): Promise<{
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  scopes?: string[];
  expiresAt?: string;
} | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, META_PROVIDER)),
  });
  if (!row) return { connected: false };
  const meta = (row.metadata as { name?: string } | null) ?? {};
  return {
    connected: true,
    accountEmail: row.accountEmail ?? undefined,
    accountName: meta.name,
    scopes: (row.scopes as string[]) ?? [],
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : undefined,
  };
}

export { exchangeForLongLived };

/**
 * Long-lived user token NÃO é o ideal pra CAPI server-to-server.
 * Pra CAPI o recomendado é gerar System User Token na conta Business — input separado na UI.
 * Este lib lida com pixel discovery + verificação. CAPI token é entrada separada.
 */
