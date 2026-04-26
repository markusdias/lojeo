import { notFound } from 'next/navigation';
import { auth } from '../../../../auth';
import { db, orders, orderItems, orderEvents } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  preparing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_ICON: Record<string, string> = {
  pending: '◉',
  paid: '✓',
  preparing: '◈',
  shipped: '→',
  delivered: '✓',
  cancelled: '✕',
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const tid = tenantId();
  const email = session?.user?.email;
  const userId = session?.user?.id;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.tenantId, tid), eq(orders.id, id)),
  });

  if (!order) notFound();

  // Security: only show order if belongs to this customer
  const belongsToCustomer =
    (userId && order.userId === userId) ||
    (email && order.customerEmail === email);

  if (!belongsToCustomer) notFound();

  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(and(eq(orderItems.orderId, id), eq(orderItems.tenantId, tid))),
    db.select().from(orderEvents).where(and(eq(orderEvents.orderId, id), eq(orderEvents.tenantId, tid))).orderBy(desc(orderEvents.createdAt)),
  ]);

  const addr = order.shippingAddress as Record<string, string>;

  return (
    <div>
      <Link href="/conta/pedidos" style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none' }}>
        ← Meus pedidos
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{order.orderNumber}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 99,
          background: 'var(--accent-soft)', color: 'var(--accent)',
        }}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Items */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Itens</h2>
        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <div key={item.id} style={{
              display: 'flex', gap: 16, padding: '16px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
              alignItems: 'center',
            }}>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.productName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, fontSize: 14 }}>{item.productName}</p>
                {item.variantName && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.variantName}</p>}
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Qty: {item.qty}</p>
              </div>
              <p style={{ fontWeight: 500, fontSize: 14 }}>{fmt(item.totalCents)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Summary */}
      <section style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Endereço de entrega</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {addr.recipientName}<br />
            {addr.street}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}<br />
            {addr.neighborhood && `${addr.neighborhood}, `}{addr.city} — {addr.state}<br />
            CEP {addr.postalCode}
          </p>
        </div>

        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Resumo financeiro</h3>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span>{fmt(order.subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Frete</span>
              <span>{order.shippingCents === 0 ? 'Grátis' : fmt(order.shippingCents)}</span>
            </div>
            {order.discountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Desconto</span>
                <span style={{ color: '#059669' }}>-{fmt(order.discountCents)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, paddingTop: 8, borderTop: '1px solid var(--divider)', marginTop: 4 }}>
              <span>Total</span>
              <span>{fmt(order.totalCents)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tracking */}
      {order.trackingCode && (
        <section style={{ marginBottom: 32, padding: '16px 20px', background: 'var(--accent-soft)', borderRadius: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)', marginBottom: 4 }}>Código de rastreio</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{order.trackingCode}</p>
          {order.shippingCarrier && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{order.shippingCarrier} · {order.shippingService}</p>
          )}
        </section>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Histórico</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                    background: i === 0 ? 'var(--accent)' : 'var(--surface-sunken)',
                    border: '1px solid var(--divider)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, color: i === 0 ? '#fff' : 'var(--text-muted)',
                  }}>
                    {STATUS_ICON[ev.toStatus ?? ''] ?? '●'}
                  </div>
                  {i < events.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'var(--divider)', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: 20, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>
                    {ev.toStatus ? (STATUS_LABEL[ev.toStatus] ?? ev.toStatus) : ev.eventType}
                  </p>
                  {ev.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ev.notes}</p>}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(ev.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
