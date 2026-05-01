import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../../lib/roles';
import { getValidAccessToken } from '../../../../../lib/oauth/google';

export const dynamic = 'force-dynamic';

interface GtmContainerSummary {
  accountId: string;
  accountName: string;
  containerId: string;
  publicId: string;
  name: string;
}

interface Ga4PropertySummary {
  accountId: string;
  accountName: string;
  propertyId: string;
  propertyName: string;
  measurementId?: string;
}

interface AdsCustomerSummary {
  customerId: string;
  resourceName: string;
}

interface ResourcesPayload {
  gtm: GtmContainerSummary[];
  ga4: Ga4PropertySummary[];
  ads: AdsCustomerSummary[];
  errors: { gtm?: string; ga4?: string; ads?: string };
}

async function fetchJson<T>(url: string, token: string, extraHeaders: Record<string, string> = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json', ...extraHeaders },
      cache: 'no-store',
    });
    if (!r.ok) {
      const txt = await r.text();
      return { ok: false, error: `HTTP ${r.status} · ${txt.slice(0, 120)}` };
    }
    return { ok: true, data: (await r.json()) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function listGtmContainers(token: string): Promise<{ items: GtmContainerSummary[]; error?: string }> {
  const accountsRes = await fetchJson<{ account?: Array<{ accountId: string; name: string }> }>(
    'https://tagmanager.googleapis.com/tagmanager/v2/accounts',
    token,
  );
  if (!accountsRes.ok) return { items: [], error: accountsRes.error };
  const accounts = accountsRes.data.account ?? [];
  const items: GtmContainerSummary[] = [];
  for (const acc of accounts) {
    const r = await fetchJson<{ container?: Array<{ containerId: string; publicId: string; name: string }> }>(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${acc.accountId}/containers`,
      token,
    );
    if (!r.ok) continue;
    for (const c of r.data.container ?? []) {
      items.push({
        accountId: acc.accountId,
        accountName: acc.name,
        containerId: c.containerId,
        publicId: c.publicId,
        name: c.name,
      });
    }
  }
  return { items };
}

async function listGa4Properties(token: string): Promise<{ items: Ga4PropertySummary[]; error?: string }> {
  // GA4 Admin API — listAccountSummaries traz accounts + propertySummaries de uma vez
  const res = await fetchJson<{
    accountSummaries?: Array<{
      account: string;
      displayName: string;
      propertySummaries?: Array<{ property: string; displayName: string; propertyType?: string }>;
    }>;
  }>('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', token);
  if (!res.ok) return { items: [], error: res.error };
  const items: Ga4PropertySummary[] = [];
  for (const acc of res.data.accountSummaries ?? []) {
    const accountId = acc.account?.split('/').pop() ?? '';
    for (const p of acc.propertySummaries ?? []) {
      const propertyId = p.property?.split('/').pop() ?? '';
      // Buscar measurementId via dataStreams (best-effort, primeiro stream WEB)
      let measurementId: string | undefined;
      const streams = await fetchJson<{ dataStreams?: Array<{ type?: string; webStreamData?: { measurementId?: string } }> }>(
        `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
        token,
      );
      if (streams.ok) {
        const web = streams.data.dataStreams?.find((s) => s.type === 'WEB_DATA_STREAM');
        measurementId = web?.webStreamData?.measurementId;
      }
      items.push({
        accountId,
        accountName: acc.displayName ?? '',
        propertyId,
        propertyName: p.displayName ?? '',
        measurementId,
      });
    }
  }
  return { items };
}

async function listAdsCustomers(token: string): Promise<{ items: AdsCustomerSummary[]; error?: string }> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) {
    return {
      items: [],
      error: 'Google Ads API requer developer token (GOOGLE_ADS_DEVELOPER_TOKEN). Aprovação Google leva 1-2 semanas — use modo manual por enquanto.',
    };
  }
  const res = await fetchJson<{ resourceNames?: string[] }>(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    token,
    { 'developer-token': devToken },
  );
  if (!res.ok) return { items: [], error: res.error };
  const items = (res.data.resourceNames ?? []).map((rn) => ({
    resourceName: rn,
    customerId: rn.split('/').pop() ?? '',
  }));
  return { items };
}

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const token = await getValidAccessToken(TENANT_ID);
  if (!token) {
    return NextResponse.json({ error: 'not_connected', message: 'Conecte o Google primeiro' }, { status: 400 });
  }

  const [gtm, ga4, ads] = await Promise.all([
    listGtmContainers(token),
    listGa4Properties(token),
    listAdsCustomers(token),
  ]);

  const payload: ResourcesPayload = {
    gtm: gtm.items,
    ga4: ga4.items,
    ads: ads.items,
    errors: {
      ...(gtm.error ? { gtm: gtm.error } : {}),
      ...(ga4.error ? { ga4: ga4.error } : {}),
      ...(ads.error ? { ads: ads.error } : {}),
    },
  };

  return NextResponse.json(payload);
}
