import { NextResponse } from 'next/server';
import { db, affiliateLinks } from '@lojeo/db';
import { sql } from 'drizzle-orm';
import { buildAffiliateSetCookieHeader } from '../../../lib/affiliates/tracking';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * GET /r/[code] — short link público para compartilhamento.
 * Increment click + set cookie 30d + redirect para destino (default homepage).
 *
 * Uso: `https://store.com/r/MARIA10` ou `https://store.com/r/MARIA10?to=/produtos/anel-x`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const url = new URL(req.url);
  const dest = url.searchParams.get('to') ?? '/';

  // Sanity: dest path internal only (anti open redirect).
  const safeDest = dest.startsWith('/') && !dest.startsWith('//') ? dest : '/';

  // Resolve public origin behind reverse proxy. Prefer x-forwarded-host
  // (NextResponse.redirect com URL absoluta usa req.url que aponta pra
  // 0.0.0.0:3000 em standalone build) — usa relative path quando possível.
  // Path-relative redirect é safe e respeita host original.
  const redirectUrl = safeDest;

  if (!code) {
    return NextResponse.redirect(new URL(redirectUrl, url.origin), 307);
  }

  // Increment atomic best-effort. Guards: archivado, expirado, atingiu maxUses → não credita click.
  void db.execute(sql`
    UPDATE affiliate_links
    SET clicks = clicks + 1, last_click_at = NOW(), updated_at = NOW()
    WHERE tenant_id = ${TENANT_ID}
      AND code = ${code}
      AND active = TRUE
      AND archived_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR conversions < max_uses)
  `).catch(() => null);

  void affiliateLinks; // mantém import — usado em type chain.

  // Construir Response manualmente pra Location relativo (browser respeita host).
  const res = new NextResponse(null, {
    status: 307,
    headers: { location: redirectUrl },
  });
  const cookie = buildAffiliateSetCookieHeader(code);
  if (cookie) res.headers.set('set-cookie', cookie);
  return res;
}
