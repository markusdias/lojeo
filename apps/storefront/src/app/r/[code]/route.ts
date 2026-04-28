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

  if (!code) {
    return NextResponse.redirect(new URL(safeDest, url.origin));
  }

  // Increment atomic (best-effort) — sem aguardar resultado pra UX rápido.
  void db.execute(sql`
    UPDATE affiliate_links
    SET clicks = clicks + 1, updated_at = NOW()
    WHERE tenant_id = ${TENANT_ID}
      AND code = ${code}
      AND active = TRUE
  `).catch(() => null);

  void affiliateLinks; // mantém import — usado em type chain.

  const res = NextResponse.redirect(new URL(safeDest, url.origin));
  const cookie = buildAffiliateSetCookieHeader(code);
  if (cookie) res.headers.set('set-cookie', cookie);
  return res;
}
