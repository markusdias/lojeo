import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, orders } from '@lojeo/db';
import { eq, and, not, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers, SEGMENT_LABELS } from '@lojeo/engine';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default async function ClienteProfilePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail).toLowerCase();

  // Aggregate stats
  const [agg] = await db
    .select({
      orderCount: sql<number>`cast(count(*) as int)`,
      totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
      lastOrderAt: sql<string>`max(${orders.createdAt})`,
      firstOrderAt: sql<string>`min(${orders.createdAt})`,
      userId: orders.userId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, TENANT_ID),
        eq(orders.customerEmail, email),
        not(eq(orders.status, 'cancelled')),
      )
    )
    .groupBy(orders.userId);

  if (!agg) notFound();

  const profiles = scoreCustomers([{
    email,
    userId: agg.userId,
    orderCount: agg.orderCount,
    totalCents: agg.totalCents,
    lastOrderAt: new Date(agg.lastOrderAt),
    firstOrderAt: new Date(agg.firstOrderAt),
  }]);
  const profile = profiles[0];
  if (!profile) notFound();

  // Recent orders
  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      paymentMethod: orders.paymentMethod,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', processing: 'Processando',
    shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <Link href="/clientes" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
        ← Clientes
      </Link>

      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f9fafb', marginBottom: 4 }}>{email}</h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Cliente desde {new Date(agg.firstOrderAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* RFM summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Segmento', value: SEGMENT_LABELS[profile.segment] },
          { label: 'LTV', value: fmt(profile.totalCents) },
          { label: 'Pedidos', value: String(profile.orderCount) },
          { label: 'Último pedido', value: `${profile.daysSinceLastOrder}d atrás` },
        ].map(card => (
          <div key={card.label} style={{
            background: '#111827', border: '1px solid #1f2937',
            borderRadius: 8, padding: '16px 20px',
          }}>
            <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#f9fafb' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* RFM scores */}
      <div style={{ marginBottom: 32, background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Score RFM (1–5)</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Recência', value: profile.rfm.recency },
            { label: 'Frequência', value: profile.rfm.frequency },
            { label: 'Monetário', value: profile.rfm.monetary },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{s.label}</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: n <= s.value ? '#2563eb' : '#1f2937',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e5e7eb', marginBottom: 12 }}>Pedidos</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1f2937' }}>
            {['Nº', 'Data', 'Status', 'Total', 'Pagamento'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentOrders.map(o => (
            <tr key={o.id} style={{ borderBottom: '1px solid #111827' }}>
              <td style={{ padding: '10px 12px' }}>
                <Link href={`/pedidos/${o.id}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                  {o.orderNumber}
                </Link>
              </td>
              <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                {new Date(o.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td style={{ padding: '10px 12px', color: '#d1d5db' }}>
                {STATUS_LABELS[o.status] ?? o.status}
              </td>
              <td style={{ padding: '10px 12px', color: '#d1d5db' }}>{fmt(o.totalCents)}</td>
              <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{o.paymentMethod ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
