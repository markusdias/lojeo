import { NextRequest, NextResponse } from 'next/server';
import { db, affiliateLinks } from '@lojeo/db';
import { and, eq, isNull, isNotNull, or, ilike, asc, desc, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { TENANT_ID } from '../../../lib/roles';
import { authorizeCronRequest } from '../../../lib/cron-auth';
import { guardPermission } from '../../../lib/permission-guard';

export const dynamic = 'force-dynamic';

const SORT_COLUMNS = {
  created: affiliateLinks.createdAt,
  name: affiliateLinks.affiliateName,
  code: affiliateLinks.code,
  clicks: affiliateLinks.clicks,
  conversions: affiliateLinks.conversions,
  pending: affiliateLinks.pendingCents,
  paid: affiliateLinks.payoutCents,
  lastClick: affiliateLinks.lastClickAt,
  lastConversion: affiliateLinks.lastConversionAt,
} as const;
type SortKey = keyof typeof SORT_COLUMNS;

export async function GET(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const denied = await guardPermission('settings', 'read');
  if (denied) return denied;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const statusParam = (url.searchParams.get('status') ?? 'active').toLowerCase();
  const tag = (url.searchParams.get('tag') ?? '').trim();
  const sortKey = ((url.searchParams.get('sort') ?? 'created') as SortKey);
  const dirParam = (url.searchParams.get('dir') ?? 'desc').toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));

  const conds: SQL[] = [eq(affiliateLinks.tenantId, TENANT_ID)];

  if (statusParam === 'archived') {
    conds.push(isNotNull(affiliateLinks.archivedAt));
  } else if (statusParam === 'active') {
    conds.push(isNull(affiliateLinks.archivedAt));
    conds.push(eq(affiliateLinks.active, true));
  } else if (statusParam === 'paused') {
    conds.push(isNull(affiliateLinks.archivedAt));
    conds.push(eq(affiliateLinks.active, false));
  } else if (statusParam === 'all') {
    // sem filtro adicional
  } else if (statusParam === 'live') {
    // active não-archived (alias)
    conds.push(isNull(affiliateLinks.archivedAt));
    conds.push(eq(affiliateLinks.active, true));
  }

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    const search = or(
      ilike(affiliateLinks.affiliateName, like),
      ilike(affiliateLinks.affiliateEmail, like),
      ilike(affiliateLinks.code, like),
    );
    if (search) conds.push(search);
  }

  if (tag) {
    conds.push(eq(affiliateLinks.tag, tag));
  }

  const where = conds.length === 1 ? conds[0] : and(...conds);

  const sortCol = SORT_COLUMNS[sortKey] ?? SORT_COLUMNS.created;
  const orderBy = dirParam === 'asc' ? asc(sortCol) : desc(sortCol);

  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(affiliateLinks)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateLinks)
      .where(where),
  ]);
  const count = totalRows[0]?.count ?? 0;

  const totals = await db
    .select({
      tags: sql<{ tag: string | null; n: number }[]>`
        json_agg(json_build_object('tag', t.tag, 'n', t.n))
        FILTER (WHERE t.tag IS NOT NULL)
      `,
    })
    .from(
      sql`(
        SELECT tag, count(*)::int AS n
        FROM affiliate_links
        WHERE tenant_id = ${TENANT_ID}
        GROUP BY tag
      ) t`,
    );

  return NextResponse.json({
    ok: true,
    affiliates: rows,
    meta: {
      page,
      pageSize,
      total: count,
      pages: Math.max(1, Math.ceil(count / pageSize)),
      sort: sortKey,
      dir: dirParam,
      status: statusParam,
      q,
      tag: tag || null,
      tagFacets: totals[0]?.tags ?? [],
    },
  });
}

const COMMISSION_BPS_MIN = 0;
const COMMISSION_BPS_MAX = 10000;
const COOKIE_DAYS_MIN = 1;
const COOKIE_DAYS_MAX = 365;

const createSchema = z.object({
  affiliateName: z.string().min(2).max(200),
  affiliateEmail: z.string().email().optional().nullable(),
  code: z.string().min(2).max(32).regex(/^[A-Z0-9-]+$/, 'code must be A-Z 0-9 -'),
  commissionBps: z.number().int().min(COMMISSION_BPS_MIN).max(COMMISSION_BPS_MAX).default(1000),
  cookieDays: z.number().int().min(COOKIE_DAYS_MIN).max(COOKIE_DAYS_MAX).default(30),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  tag: z.string().max(40).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const denied = await guardPermission('settings', 'write');
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(affiliateLinks)
      .values({
        tenantId: TENANT_ID,
        affiliateName: parsed.data.affiliateName,
        affiliateEmail: parsed.data.affiliateEmail ?? null,
        code: parsed.data.code.toUpperCase(),
        commissionBps: parsed.data.commissionBps,
        cookieDays: parsed.data.cookieDays,
        maxUses: parsed.data.maxUses ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        tag: parsed.data.tag ?? null,
        notes: parsed.data.notes ?? null,
        active: true,
      })
      .returning();

    return NextResponse.json({ ok: true, affiliate: inserted[0] }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_affiliates_tenant_code')) {
      return NextResponse.json({ error: 'code_already_exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
