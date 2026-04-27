import { db, affiliateLinks } from '@lojeo/db';
import { eq, desc } from 'drizzle-orm';
import { AffiliatesPanel } from './affiliates-panel';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

export default async function AfiliadosPage() {
  const rows = await db
    .select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.tenantId, TENANT_ID))
    .orderBy(desc(affiliateLinks.createdAt))
    .limit(200);

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          Afiliados
        </h1>
        <p className="body-s">
          {rows.length} afiliado{rows.length === 1 ? '' : 's'} cadastrado{rows.length === 1 ? '' : 's'} · cliques + conversões + comissão pendente
        </p>
      </header>
      <AffiliatesPanel
        initial={rows.map((r) => ({
          id: r.id,
          affiliateName: r.affiliateName,
          affiliateEmail: r.affiliateEmail,
          code: r.code,
          commissionBps: r.commissionBps,
          clicks: r.clicks,
          conversions: r.conversions,
          payoutCents: r.payoutCents,
          pendingCents: r.pendingCents,
          active: r.active,
        }))}
      />
    </div>
  );
}
