import { auth } from '../../../auth';
import { db, orders, orderItems } from '@lojeo/db';
import { eq, and, desc, or } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#92400E',
  paid: '#065F46',
  preparing: '#1E40AF',
  shipped: '#5B21B6',
  delivered: '#065F46',
  cancelled: '#991B1B',
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function PedidosPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect('/entrar');
  }
  if (!session?.user) redirect('/entrar');
  const tid = tenantId();
  const email = session?.user?.email;
  const userId = session?.user?.id;

  const conditions = [eq(orders.tenantId, tid)];

  if (userId && email) {
    conditions.push(or(eq(orders.userId, userId), eq(orders.customerEmail, email))!);
  } else if (userId) {
    conditions.push(eq(orders.userId, userId));
  } else if (email) {
    conditions.push(eq(orders.customerEmail, email));
  }

  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const orderIds = rows.map(o => o.id);

  const items = orderIds.length > 0
    ? await db.select().from(orderItems).where(
        and(eq(orderItems.tenantId, tid))
      ).limit(200)
    : [];

  const itemsByOrder = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.orderId;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(item);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 32 }}>Meus pedidos</h1>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 24 }}>Você ainda não fez nenhum pedido.</p>
          <Link
            href="/produtos"
            style={{
              display: 'inline-block', padding: '12px 28px', fontSize: 14, fontWeight: 500,
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              borderRadius: 6, textDecoration: 'none',
            }}
          >
            Ver produtos
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map(order => {
          const orderItemList = itemsByOrder[order.id] ?? [];
          const statusLabel = STATUS_LABEL[order.status] ?? order.status;
          const statusColor = STATUS_COLOR[order.status] ?? 'var(--text-secondary)';

          return (
            <Link
              key={order.id}
              href={`/conta/pedidos/${order.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '16px 20px',
                background: 'var(--surface)',
                transition: 'box-shadow 150ms',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: 2 }}>{order.orderNumber}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: `${statusColor}18`, color: statusColor,
                    }}>
                      {statusLabel}
                    </span>
                    <p style={{ fontSize: 14, fontWeight: 500, marginTop: 6 }}>{fmt(order.totalCents)}</p>
                  </div>
                </div>

                {orderItemList.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {orderItemList.slice(0, 2).map((item, i) => (
                      <span key={i}>{i > 0 ? ', ' : ''}{item.productName}{item.qty > 1 ? ` ×${item.qty}` : ''}</span>
                    ))}
                    {orderItemList.length > 2 && <span> + {orderItemList.length - 2} item(ns)</span>}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
