import { db, affiliateLinks } from '@lojeo/db';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { AffiliatesPanel } from './affiliates-panel';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const STOREFRONT_ORIGIN = process.env.NEXT_PUBLIC_STOREFRONT_URL
  ?? process.env.STOREFRONT_URL
  ?? 'https://apps-lojeo-storefront.m9axtw.easypanel.host';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AfiliadosPage() {
  const where = and(
    eq(affiliateLinks.tenantId, TENANT_ID),
    isNull(affiliateLinks.archivedAt),
    eq(affiliateLinks.active, true),
  );

  const [rows, totalRows, tagFacetsRows] = await Promise.all([
    db
      .select()
      .from(affiliateLinks)
      .where(where)
      .orderBy(desc(affiliateLinks.createdAt))
      .limit(PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateLinks)
      .where(where),
    db
      .select({
        tag: affiliateLinks.tag,
        n: sql<number>`count(*)::int`,
      })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.tenantId, TENANT_ID))
      .groupBy(affiliateLinks.tag),
  ]);

  const tagFacets = tagFacetsRows
    .filter((r) => r.tag)
    .map((r) => ({ tag: r.tag, n: r.n }));

  const total = totalRows[0]?.count ?? 0;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          Afiliados
        </h1>
        <p className="body-s">
          Gerencie embaixadores, parceiros e influenciadores. Cada afiliado tem código próprio, comissão personalizada, validade e limite de conversões. As comissões são creditadas automaticamente quando a venda é atribuída via cookie.
        </p>
      </header>

      <AffiliatesPanel
        storefrontOrigin={STOREFRONT_ORIGIN}
        initial={rows.map((r) => ({
          id: r.id,
          affiliateName: r.affiliateName,
          affiliateEmail: r.affiliateEmail,
          code: r.code,
          commissionBps: r.commissionBps,
          cookieDays: r.cookieDays,
          maxUses: r.maxUses,
          expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
          tag: r.tag,
          clicks: r.clicks,
          conversions: r.conversions,
          payoutCents: r.payoutCents,
          pendingCents: r.pendingCents,
          active: r.active,
          archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
          lastClickAt: r.lastClickAt ? r.lastClickAt.toISOString() : null,
          lastConversionAt: r.lastConversionAt ? r.lastConversionAt.toISOString() : null,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        }))}
        initialMeta={{
          page: 1,
          pageSize: PAGE_SIZE,
          total,
          pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
          sort: 'created',
          dir: 'desc',
          status: 'active',
          q: '',
          tag: null,
          tagFacets,
        }}
      />
    </div>
  );
}
