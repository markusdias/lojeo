import { db, orders } from '@lojeo/db';
import { eq, and, not, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers } from '@lojeo/engine';
import { ClientesTable } from './clientes-table';
import { ChurnScanButton } from './churn-scan-button';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const rows = await db
    .select({
      email: orders.customerEmail,
      userId: orders.userId,
      orderCount: sql<number>`cast(count(*) as int)`,
      totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
      lastOrderAt: sql<string>`max(${orders.createdAt})`,
      firstOrderAt: sql<string>`min(${orders.createdAt})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, TENANT_ID),
        not(eq(orders.status, 'cancelled')),
        isNotNull(orders.customerEmail),
      )
    )
    .groupBy(orders.customerEmail, orders.userId)
    .orderBy(sql`max(${orders.createdAt}) desc`)
    .limit(500);

  const inputs = rows
    .filter(r => r.email)
    .map(r => ({
      email: r.email as string,
      userId: r.userId,
      orderCount: r.orderCount,
      totalCents: r.totalCents,
      lastOrderAt: new Date(r.lastOrderAt),
      firstOrderAt: new Date(r.firstOrderAt),
    }));

  const profiles = scoreCustomers(inputs);

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Clientes</h1>
          <p className="body-s">{profiles.length} cliente{profiles.length === 1 ? '' : 's'} segmentados via RFM (Recency × Frequency × Monetary)</p>
        </div>
        <ChurnScanButton />
      </header>
      <ClientesTable customers={profiles} />
    </div>
  );
}
