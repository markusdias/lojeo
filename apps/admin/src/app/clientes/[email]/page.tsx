import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, orders } from '@lojeo/db';
import { eq, and, not, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers, SEGMENT_LABELS, computeCustomerLtv, type OrderForLtv } from '@lojeo/engine';

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

  const ltvRows = await db
    .select({
      customerEmail: orders.customerEmail,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)));

  const ltvInput: OrderForLtv[] = ltvRows.map(r => ({
    email: r.customerEmail ?? '',
    totalCents: r.totalCents ?? 0,
    createdAt: new Date(r.createdAt),
    status: r.status ?? 'pending',
  }));
  const ltv = computeCustomerLtv(ltvInput, email);
  const ltvProjectedCents = ltv
    ? Math.round(ltv.avgOrderCents * (ltv.expectedLifetimeMonths / 3))
    : 0;

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', processing: 'Processando',
    shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
  };

  const segmentLabel = SEGMENT_LABELS[profile.segment];
  const aiMessage = profile.segment === 'champions'
    ? `Cliente Champion (RFM 5/5/4+) — alto LTV ${fmt(profile.totalCents)}, comprou há ${profile.daysSinceLastOrder}d. Considere oferta exclusiva ou programa de fidelidade.`
    : profile.segment === 'at_risk'
      ? `Cliente em risco — última compra há ${profile.daysSinceLastOrder}d, era recorrente (${profile.orderCount} pedidos). Acionar campanha de reativação com cupom -10%.`
      : profile.segment === 'lost'
        ? `Cliente perdido — sem compra há ${profile.daysSinceLastOrder}d. Considere remover de fluxos ativos ou tentar reconquista única.`
        : profile.segment === 'new'
          ? `Cliente novo — primeira compra há ${profile.daysSinceLastOrder}d. Cadência de onboarding + cross-sell ainda válidos.`
          : `Cliente com ${profile.orderCount} pedidos · ${segmentLabel}. Ticket médio ${fmt(ltv?.avgOrderCents ?? 0)}.`;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <Link href="/clientes" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Clientes
      </Link>

      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          {email}
        </h1>
        <p className="body-s">
          Cliente desde {new Date(agg.firstOrderAt).toLocaleDateString('pt-BR')} · <span className="lj-badge lj-badge-accent">{segmentLabel}</span>
        </p>
      </header>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · PRÓXIMAS OPORTUNIDADES</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>{aiMessage}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          { label: 'Segmento', value: segmentLabel },
          { label: 'LTV', value: fmt(profile.totalCents) },
          { label: 'Pedidos', value: String(profile.orderCount) },
          { label: 'Último pedido', value: `${profile.daysSinceLastOrder}d atrás` },
        ].map(card => (
          <div key={card.label} className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>{card.label}</p>
            <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Score RFM (1–5)</p>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {[
            { label: 'Recência', value: profile.rfm.recency },
            { label: 'Frequência', value: profile.rfm.frequency },
            { label: 'Monetário', value: profile.rfm.monetary },
          ].map(s => (
            <div key={s.label}>
              <p className="caption" style={{ marginBottom: 4 }}>{s.label}</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: n <= s.value ? 'var(--accent)' : 'var(--neutral-100)',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {ltv && (
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>LTV · Customer Lifetime Value</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { label: 'Total gasto', value: fmt(ltv.totalCents) },
              { label: 'Pedidos', value: String(ltv.orderCount) },
              { label: 'Ticket médio', value: fmt(ltv.avgOrderCents) },
              { label: 'LTV projetado', value: fmt(ltvProjectedCents) },
              { label: 'Tempo ativo', value: `${ltv.expectedLifetimeMonths}m` },
            ].map(s => (
              <div key={s.label}>
                <p className="caption" style={{ marginBottom: 4 }}>{s.label}</p>
                <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', color: 'var(--fg)' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <p className="caption" style={{ marginTop: 'var(--space-3)' }}>
            LTV em USD: ${ltv.ltvUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} · Janela ativa: {ltv.daysActive} dias
          </p>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Pedidos recentes</h2>
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {['Nº', 'Data', 'Status', 'Total', 'Pagamento'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Link href={`/pedidos/${o.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)' }}>{fmt(o.totalCents)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{o.paymentMethod ?? '—'}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg-secondary)' }}>
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
