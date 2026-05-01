import { eq, and } from 'drizzle-orm';
import { db, tenantOauthTokens } from '@lojeo/db';
import { encryptSecret, decryptSecret } from '../oauth-crypto';

export const TIKTOK_PROVIDER = 'tiktok';
const API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

export const TIKTOK_SCOPE_VERSION = 'v1';

export function buildAuthorizeUrl(opts: { redirectUri: string; state: string }): string {
  const appId = process.env.TIKTOK_APP_ID;
  if (!appId) throw new Error('TIKTOK_APP_ID not configured');
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    rid: crypto.randomUUID(),
  });
  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

interface TokenResponse {
  data: {
    access_token: string;
    advertiser_ids: string[];
    scope: number[];
    creator_advertisers?: Array<{ advertiser_id: string; creator_id: string }>;
  };
  message: string;
  code: number;
  request_id: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const appId = process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_APP_SECRET;
  if (!appId || !secret) throw new Error('TikTok OAuth credentials missing');
  const r = await fetch(`${API_BASE}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      secret,
      auth_code: code,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`tiktok_token_exchange_failed: ${err.slice(0, 200)}`);
  }
  const data = (await r.json()) as TokenResponse;
  if (data.code !== 0) throw new Error(`tiktok_token_error: ${data.message}`);
  return data;
}

export interface TikTokAdvertiser {
  advertiserId: string;
  advertiserName: string;
  status?: string;
}

export async function fetchAdvertisers(accessToken: string, advertiserIds: string[]): Promise<{ items: TikTokAdvertiser[]; error?: string }> {
  if (advertiserIds.length === 0) return { items: [] };
  const url = new URL(`${API_BASE}/oauth2/advertiser/get/`);
  url.searchParams.set('app_id', process.env.TIKTOK_APP_ID ?? '');
  url.searchParams.set('secret', process.env.TIKTOK_APP_SECRET ?? '');
  const r = await fetch(url.toString(), {
    headers: { 'Access-Token': accessToken },
  });
  if (!r.ok) return { items: [], error: `HTTP ${r.status}` };
  const data = (await r.json()) as {
    code: number;
    message: string;
    data?: { list?: Array<{ advertiser_id: string; advertiser_name: string }> };
  };
  if (data.code !== 0) return { items: [], error: data.message };
  return {
    items: (data.data?.list ?? []).map((a) => ({
      advertiserId: a.advertiser_id,
      advertiserName: a.advertiser_name,
    })),
  };
}

export interface TikTokPixel {
  pixelCode: string;
  pixelName: string;
  advertiserId: string;
  advertiserName: string;
}

export async function fetchPixels(accessToken: string, advertisers: TikTokAdvertiser[]): Promise<{ items: TikTokPixel[]; error?: string }> {
  const items: TikTokPixel[] = [];
  for (const adv of advertisers) {
    const url = new URL(`${API_BASE}/pixel/list/`);
    url.searchParams.set('advertiser_id', adv.advertiserId);
    url.searchParams.set('page_size', '50');
    const r = await fetch(url.toString(), { headers: { 'Access-Token': accessToken } });
    if (!r.ok) continue;
    const data = (await r.json()) as {
      code: number;
      data?: { pixels?: Array<{ pixel_code: string; pixel_name: string }> };
    };
    if (data.code !== 0) continue;
    for (const px of data.data?.pixels ?? []) {
      items.push({
        pixelCode: px.pixel_code,
        pixelName: px.pixel_name,
        advertiserId: adv.advertiserId,
        advertiserName: adv.advertiserName,
      });
    }
  }
  return { items };
}

export async function saveTikTokConnection(opts: {
  tenantId: string;
  accessToken: string;
  advertiserIds: string[];
}): Promise<void> {
  const enc = encryptSecret(opts.accessToken);
  // TikTok Business access tokens não expiram por padrão. Setar expiresAt 1 ano à frente.
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const existing = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, opts.tenantId), eq(tenantOauthTokens.provider, TIKTOK_PROVIDER)),
  });

  if (existing) {
    await db
      .update(tenantOauthTokens)
      .set({
        accessTokenEnc: enc,
        expiresAt,
        scopes: [],
        metadata: { advertiserIds: opts.advertiserIds },
        updatedAt: new Date(),
      })
      .where(eq(tenantOauthTokens.id, existing.id));
  } else {
    await db.insert(tenantOauthTokens).values({
      tenantId: opts.tenantId,
      provider: TIKTOK_PROVIDER,
      accessTokenEnc: enc,
      expiresAt,
      scopes: [],
      metadata: { advertiserIds: opts.advertiserIds },
    });
  }
}

export async function getValidAccessToken(tenantId: string): Promise<{ token: string; advertiserIds: string[] } | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, TIKTOK_PROVIDER)),
  });
  if (!row) return null;
  const meta = (row.metadata as { advertiserIds?: string[] } | null) ?? {};
  return {
    token: decryptSecret(row.accessTokenEnc),
    advertiserIds: meta.advertiserIds ?? [],
  };
}

export async function disconnectTikTok(tenantId: string): Promise<void> {
  await db
    .delete(tenantOauthTokens)
    .where(and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, TIKTOK_PROVIDER)));
}

export async function getConnectionStatus(tenantId: string): Promise<{
  connected: boolean;
  advertiserIds?: string[];
} | null> {
  const row = await db.query.tenantOauthTokens?.findFirst({
    where: and(eq(tenantOauthTokens.tenantId, tenantId), eq(tenantOauthTokens.provider, TIKTOK_PROVIDER)),
  });
  if (!row) return { connected: false };
  const meta = (row.metadata as { advertiserIds?: string[] } | null) ?? {};
  return { connected: true, advertiserIds: meta.advertiserIds ?? [] };
}
