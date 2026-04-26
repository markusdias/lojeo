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
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-neutral-500">{totalOrders} pedidos · {fmt(totalRevenue)} nos últimos {days} dias</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900">Dashboard</Link>
          <Link href="/products" className="text-neutral-500 hover:text-neutral-900">Produtos</Link>
        </nav>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3">
        {validStatuses.map(s => (
          <Link
            key={s}
            href={filterUrl({ status: statusFilter === s ? '' : s })}
            className={`bg-white rounded-lg shadow p-4 border-l-4 ${statusFilter === s ? 'ring-2 ring-blue-500' : ''}`}
            style={{ borderLeftColor: STATUS_COLOR[s] }}
          >
            <p className="text-xs text-neutral-500 truncate">{STATUS_LABEL[s]}</p>
            <p className="text-2xl font-semibold mt-1">{statusCounts[s]}</p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <span className="text-sm text-neutral-600">Período:</span>
        {[7, 14, 30, 90].map(d => (
          <Link
            key={d}
            href={filterUrl({ days: String(d) })}
            className={`text-sm px-3 py-1 rounded ${days === d ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 border'}`}
          >
            {d}d
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-700">Nº Pedido</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-700">Data</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-700">Destinatário</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-700">Pagamento</th>
              <th className="text-right px-4 py-3 font-medium text-neutral-700">Total</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-700">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-neutral-400">Nenhum pedido encontrado.</td>
              </tr>
            )}
            {rows.map(o => {
              const addr = o.shippingAddress as Record<string, string> | null;
              const recipient = addr?.recipientName ?? '—';
              return (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(o.createdAt!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[180px]">{recipient}</td>
                  <td className="px-4 py-3 text-neutral-600 uppercase text-xs">{o.paymentMethod?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(o.totalCents ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: STATUS_COLOR[o.status ?? 'pending'] + '20', color: STATUS_COLOR[o.status ?? 'pending'] }}
                    >
                      {STATUS_LABEL[o.status ?? 'pending']}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pedidos/${o.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex gap-2 justify-center">
          {page > 1 && (
            <Link href={filterUrl({ page: String(page - 1) })} className="px-3 py-1 border rounded text-sm hover:bg-neutral-50">
              ← Anterior
            </Link>
          )}
          <span className="px-3 py-1 text-sm text-neutral-600">{page} / {pages}</span>
          {page < pages && (
            <Link href={filterUrl({ page: String(page + 1) })} className="px-3 py-1 border rounded text-sm hover:bg-neutral-50">
              Próxima →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
