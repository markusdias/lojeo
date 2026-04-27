import { notFound } from 'next/navigation';
import { auth } from '../../../../auth';
import { db, orders, orderItems, orderEvents } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';
import Link from 'next/link';
import { StatusPill } from '../../../../components/account/status-pill';

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

// Etapas canônicas do timeline do ref jewelry-v1 — render mesmo sem orderEvents.
const TIMELINE_STAGES: Array<{ key: string; label: string }> = [
  { key: 'paid', label: 'Pagamento confirmado' },
  { key: 'preparing', label: 'Em produção' },
  { key: 'shipped', label: 'Postado' },
  { key: 'in_transit', label: 'Em trânsito' },
  { key: 'delivered', label: 'Entregue' },
];

function stageIndex(status: string) {
  switch (status) {
    case 'pending':
      return -1;
    case 'paid':
      return 0;
    case 'preparing':
      return 1;
    case 'shipped':
      return 3; // assume já em trânsito quando shipped
    case 'delivered':
      return 4;
    default:
      return -1;
  }
}

function fmtTimelineDate(d: Date | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) +
    ' · ' +
    new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

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
    db.select().from(orderEvents).where(and(eq(orderEvents.orderId, id), eq(orderEvents.tenantId, tid))).orderBy(asc(orderEvents.createdAt)),
  ]);

  const addr = order.shippingAddress as Record<string, string>;

  // Map events para datas das etapas (busca primeira ocorrência de cada status canônico).
  const stageDates: Record<string, Date | null> = {};
  for (const stage of TIMELINE_STAGES) {
    if (stage.key === 'in_transit') {
      // "Em trânsito" não tem evento próprio — usa shippedAt + 1 dia como heurística.
      stageDates[stage.key] = order.shippedAt ?? null;
      continue;
    }
    const ev = events.find(e => e.toStatus === stage.key);
    stageDates[stage.key] = ev ? new Date(ev.createdAt) : null;
  }
  // Fallback diretos a partir do order quando não há events.
  if (!stageDates.paid && order.status !== 'pending') stageDates.paid = order.createdAt;
  if (!stageDates.shipped && order.shippedAt) stageDates.shipped = order.shippedAt;
  if (!stageDates.delivered && order.deliveredAt) stageDates.delivered = order.deliveredAt;

  const currentIdx = stageIndex(order.status);

  // Previsão de entrega para etapa "Entregue" (futuro).
  let etaText = '';
  if (order.status !== 'delivered' && order.shippingDeadlineDays && order.shippedAt) {
    const eta = new Date(
      new Date(order.shippedAt).getTime() + order.shippingDeadlineDays * 24 * 60 * 60 * 1000,
    );
    etaText = 'previsto ' + eta.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }

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
        <StatusPill status={order.status} />
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

      {/* Timeline visual — etapas canônicas do pedido (ref Account.jsx Timeline) */}
      <section style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
          Status do pedido
        </p>
        <div>
          {TIMELINE_STAGES.map((stage, i) => {
            const reached = i <= currentIdx;
            const current = i === currentIdx;
            const future = !reached;
            const lastStage = i === TIMELINE_STAGES.length - 1;
            const date = stageDates[stage.key];
            const dateLabel =
              future && stage.key === 'delivered' && etaText
                ? etaText
                : date
                ? fmtTimelineDate(date)
                : future
                ? 'em breve'
                : '';
            return (
              <div
                key={stage.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr',
                  gap: 14,
                  alignItems: 'flex-start',
                  paddingBottom: 14,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    marginTop: 4,
                    background: future ? 'transparent' : 'var(--accent)',
                    border: '1.5px solid ' + (future ? 'var(--divider)' : 'var(--accent)'),
                  }}
                />
                {!lastStage && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 5,
                      top: 16,
                      bottom: 0,
                      width: 2,
                      background: future ? 'var(--divider)' : 'var(--accent)',
                    }}
                  />
                )}
                <div>
                  <div
                    style={{
                      fontWeight: current ? 500 : 400,
                      fontSize: 14,
                      color: future ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {stage.label}
                  </div>
                  {dateLabel && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Documentos — NF-e (ref Account.jsx OrderDrawer/DocBtn) */}
      {(order.invoiceUrl || order.invoiceKey) && (
        <section style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Documentos
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {order.invoiceUrl && (
              <a
                href={order.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--divider)',
                  borderRadius: 4,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              >
                ↓ NF-e (PDF)
              </a>
            )}
            {order.invoiceKey && (
              <span
                style={{
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--divider)',
                  borderRadius: 4,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
                title="Chave de acesso da NF-e"
              >
                Chave · {order.invoiceKey}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Histórico detalhado de eventos (mantém audit trail) */}
      {events.length > 0 && (
        <section>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Histórico detalhado
          </p>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
            {[...events].reverse().map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                  fontSize: 13,
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {ev.toStatus ? STATUS_LABEL[ev.toStatus] ?? ev.toStatus : ev.eventType}
                  </div>
                  {ev.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.notes}</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(ev.createdAt).toLocaleString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
