import { NextResponse } from 'next/server';
import { db, affiliateLinks } from '@lojeo/db';
import { and, eq, sql } from 'drizzle-orm';
import { buildAffiliateSetCookieHeader, extractAffiliateRefFromUrl } from '../../../../lib/affiliates/tracking';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/affiliate/click — registra click no afiliado + seta cookie 30d.
 *
 * Body (JSON): `{ ref: 'CODE' }` ou query param `?ref=CODE`.
 * Idempotência: cookie é refrescado a cada click (last-touch).
 */
export async function POST(req: Request) {
  try {
    let ref: string | null = null;
    const url = new URL(req.url);
    ref = extractAffiliateRefFromUrl(url);
    if (!ref) {
      const body = (await req.json().catch(() => ({}))) as { ref?: string };
      if (body.ref) ref = body.ref.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }
    if (!ref) {
      return NextResponse.json({ error: 'ref_required' }, { status: 400 });
    }

    // Increment clicks atomic — só se afiliado existe e ativo
    const updated = await db.execute(sql`
      UPDATE affiliate_links
      SET clicks = clicks + 1, updated_at = NOW()
      WHERE tenant_id = ${TENANT_ID}
        AND code = ${ref}
        AND active = TRUE
      RETURNING id
    `);
    const rows = (updated as unknown as { rows?: unknown[] }).rows
      ?? (Array.isArray(updated) ? (updated as unknown[]) : []);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'affiliate_not_found_or_inactive', ref }, { status: 404 });
    }

    const setCookie = buildAffiliateSetCookieHeader(ref);
    const res = NextResponse.json({ ok: true, ref });
    if (setCookie) res.headers.set('set-cookie', setCookie);
    return res;
  } catch (err) {
    console.error('[POST /api/affiliate/click]', err);
    return NextResponse.json({ error: 'click_failed' }, { status: 500 });
  }
}

/** Convenience GET — redireciona com cookie set, pra URLs como /go?ref=CODE */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = extractAffiliateRefFromUrl(url);
  const dest = url.searchParams.get('to') ?? '/';
  if (!ref) {
    return NextResponse.redirect(new URL(dest, url.origin));
  }
  // Increment clicks (best-effort)
  void db.execute(sql`
    UPDATE affiliate_links
    SET clicks = clicks + 1, updated_at = NOW()
    WHERE tenant_id = ${TENANT_ID}
      AND code = ${ref}
      AND active = TRUE
  `).catch(() => null);

  const res = NextResponse.redirect(new URL(dest, url.origin));
  const setCookie = buildAffiliateSetCookieHeader(ref);
  if (setCookie) res.headers.set('set-cookie', setCookie);
  return res;
}

/** ESLint helper — `and` import garantido pra schema usage futuro. */
void and;
void eq;
void affiliateLinks;
