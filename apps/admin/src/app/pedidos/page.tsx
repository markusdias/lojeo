import Link from 'next/link';
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { db, orders } from '@lojeo/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

const STATUS_LABEL: Record<string, string> = {
  pending:   'Aguardando pagamento',
  paid:      'Pago',
  preparing: 'Em separação',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#D97706',
  paid:      '#059669',
  preparing: '#2563EB',
  shipped:   '#7C3AED',
  delivered: '#10B981',
  cancelled: '#6B7280',
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect('/login');

  const sp = await searchParams;
  const statusFilter = sp['status'] ?? '';
  const days = parseInt(sp['days'] ?? '30', 10);
  const page = Math.max(1, parseInt(sp['page'] ?? '1', 10));
  const PAGE_SIZE = 25;
  const tid = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const validStatuses = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

  const conditions = [eq(orders.tenantId, tid), gte(orders.createdAt, since)];
  if (statusFilter && validStatuses.includes(statusFilter)) {
    conditions.push(eq(orders.status, statusFilter));
  }

  const [rows, countResult, summaryResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`COUNT(*)` }).from(orders).where(and(...conditions)),
    db
      .select({
        total: sql<number>`COALESCE(SUM(total_cents), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tid), gte(orders.createdAt, since))),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const pages = Math.ceil(total / PAGE_SIZE);
  const totalRevenue = Number(summaryResult[0]?.total ?? 0);
  const totalOrders = Number(summaryResult[0]?.count ?? 0);

  const statusCounts = validStatuses.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: 0 }), {});
  const statusCountResult = await db
    .select({ status: orders.status, count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(eq(orders.tenantId, tid), gte(orders.createdAt, since)))
    .groupBy(orders.status);
  for (const r of statusCountResult) statusCounts[r.status] = Number(r.count);

  function filterUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams({ status: statusFilter, days: String(days), page: '1', ...overrides });
    return `/pedidos?${p.toString()}`;
  }

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="min-h-screen space-y-6">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Pedidos</h1>
          <p className="body-s">{totalOrders} pedidos · {fmt(totalRevenue)} nos últimos {days} dias</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[7, 14, 30, 90].map(d => (
            <Link
              key={d}
              href={filterUrl({ days: String(d) })}
              className={days === d ? 'lj-btn-primary' : 'lj-btn-secondary'}
              style={{ textDecoration: 'none' }}
            >
              {d}d
            </Link>
          ))}
        </div>
      </header>

      {/* Status pill filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Link
          href={filterUrl({ status: '' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-body-s)',
            fontWeight: 'var(--w-medium)',
            textDecoration: 'none',
            background: !statusFilter ? 'var(--neutral-900)' : 'var(--bg-elevated)',
            color: !statusFilter ? 'var(--surface)' : 'var(--fg)',
            border: !statusFilter ? '1px solid var(--neutral-900)' : '1px solid var(--border-strong)',
          }}
        >
          Todos <span className="numeric" style={{ color: !statusFilter ? 'var(--surface)' : 'var(--fg-secondary)', fontWeight: 'var(--w-regular)' }}>{totalOrders}</span>
        </Link>
        {validStatuses.map(s => {
          const active = statusFilter === s;
          return (
            <Link
              key={s}
              href={filterUrl({ status: active ? '' : s })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-body-s)',
                fontWeight: 'var(--w-medium)',
                textDecoration: 'none',
                background: active ? 'var(--neutral-900)' : 'var(--bg-elevated)',
                color: active ? 'var(--surface)' : 'var(--fg)',
                border: active ? '1px solid var(--neutral-900)' : '1px solid var(--border-strong)',
              }}
            >
              <span aria-hidden style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: STATUS_COLOR[s],
                display: 'inline-block',
              }} />
              {STATUS_LABEL[s]}
              <span className="numeric" style={{ color: active ? 'var(--surface)' : 'var(--fg-secondary)', fontWeight: 'var(--w-regular)' }}>
                {statusCounts[s]}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="lj-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Nº Pedido</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Data</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Destinatário</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Pagamento</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Total</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Status</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--fg-secondary)' }}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {rows.map(o => {
              const addr = o.shippingAddress as Record<string, string> | null;
              const recipient = addr?.recipientName ?? '—';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)' }}>{o.orderNumber}</td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                    {new Date(o.createdAt!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipient}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', textTransform: 'uppercase', fontSize: 'var(--text-caption)' }}>{o.paymentMethod?.replace('_', ' ')}</td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>{fmt(o.totalCents ?? 0)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-caption)',
                        fontWeight: 'var(--w-medium)',
                        background: STATUS_COLOR[o.status ?? 'pending'] + '20',
                        color: STATUS_COLOR[o.status ?? 'pending'],
                      }}
                    >
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[o.status ?? 'pending'] }} />
                      {STATUS_LABEL[o.status ?? 'pending']}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Link href={`/pedidos/${o.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)' }}>Ver →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', alignItems: 'center' }}>
          {page > 1 && (
            <Link href={filterUrl({ page: String(page - 1) })} className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
              ← Anterior
            </Link>
          )}
          <span className="caption" style={{ padding: '0 var(--space-3)' }}>{page} / {pages}</span>
          {page < pages && (
            <Link href={filterUrl({ page: String(page + 1) })} className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
              Próxima →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
