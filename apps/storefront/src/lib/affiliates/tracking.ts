// Affiliate tracking — extrai ref code, atribui conversion em orders.
//
// Helpers puros — caller injeta DB callbacks. Tests usam mock direto.

const COOKIE_NAME = 'lojeo_aff';
const COOKIE_TTL_DAYS = 30;

export interface AffiliateCookieParse {
  code: string | null;
  setAt: Date | null;
}

/**
 * Lê cookie affiliate da request. Formato: `lojeo_aff=CODE.timestamp`.
 * timestamp em ms unix pra TTL check.
 */
export function parseAffiliateCookie(cookieHeader: string | null | undefined): AffiliateCookieParse {
  if (!cookieHeader) return { code: null, setAt: null };
  const cookies = cookieHeader.split(/;\s*/);
  const target = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!target) return { code: null, setAt: null };
  const value = decodeURIComponent(target.substring(COOKIE_NAME.length + 1));
  const parts = value.split('.');
  if (parts.length !== 2) return { code: null, setAt: null };
  const code = parts[0]!;
  const ts = Number(parts[1]);
  if (!Number.isFinite(ts) || ts <= 0) return { code: null, setAt: null };
  return { code, setAt: new Date(ts) };
}

export function isCookieValid(parsed: AffiliateCookieParse, now: Date = new Date()): boolean {
  if (!parsed.code || !parsed.setAt) return false;
  const expirationMs = COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - parsed.setAt.getTime() <= expirationMs;
}

export function buildAffiliateCookieValue(code: string, now: Date = new Date()): string {
  // Formato: CODE.timestamp
  const safeCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!safeCode) return '';
  return `${safeCode}.${now.getTime()}`;
}

export function buildAffiliateSetCookieHeader(code: string, now: Date = new Date()): string {
  const value = buildAffiliateCookieValue(code, now);
  if (!value) return '';
  const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function extractAffiliateRefFromUrl(url: URL | string): string | null {
  try {
    const u = typeof url === 'string' ? new URL(url) : url;
    const ref = u.searchParams.get('ref');
    if (!ref) return null;
    const safe = ref.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return safe || null;
  } catch {
    return null;
  }
}

/**
 * Calcula comissão do afiliado em cents.
 * commission_bps = 1000 (10%) → orderTotalCents * 0.1
 */
export function computeAffiliateCommissionCents(orderTotalCents: number, commissionBps: number): number {
  if (orderTotalCents <= 0 || commissionBps <= 0) return 0;
  return Math.floor((orderTotalCents * commissionBps) / 10000);
}
