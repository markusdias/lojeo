import { db, orders } from '@lojeo/db';
import { eq, and, not, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers } from '@lojeo/engine';
import { ClientesTable } from './clientes-table';

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
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f9fafb' }}>Clientes</h1>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{profiles.length} clientes</span>
      </div>
      <ClientesTable customers={profiles} />
    </div>
  );
}
