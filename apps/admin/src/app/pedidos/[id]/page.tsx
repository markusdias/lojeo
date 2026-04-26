import Link from 'next/link';
import { auth } from '../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db, orders, orderItems, orderEvents } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const STATUS_LABEL: Record<string, string> = {
  pending:   'Aguardando pagamento',
  paid:      'Pago',
  preparing: 'Em separação',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const TRANSITIONS: Record<string, Array<{ status: string; label: string }>> = {
  pending:   [{ status: 'paid', label: 'Confirmar pagamento' }, { status: 'cancelled', label: 'Cancelar' }],
  paid:      [{ status: 'preparing', label: 'Iniciar separação' }, { status: 'cancelled', label: 'Cancelar' }],
  preparing: [{ status: 'shipped', label: 'Marcar como enviado' }, { status: 'cancelled', label: 'Cancelar' }],
  shipped:   [{ status: 'delivered', label: 'Confirmar entrega' }],
  delivered: [],
  cancelled: [],
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const tid = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  const order = await db.query.orders?.findFirst({
    where: and(eq(orders.tenantId, tid), eq(orders.id, id)),
  });
  if (!order) notFound();

  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.createdAt)),
  ]);

  const addr = order.shippingAddress as Record<string, string> | null;
  const nextSteps = TRANSITIONS[order.status ?? 'pending'] ?? [];

  async function updateStatus(formData: FormData) {
    'use server';
    const newStatus = formData.get('status') as string;
    const notes = (formData.get('notes') as string) || null;
    const trackingCode = (formData.get('trackingCode') as string) || null;

    const validTransitions = TRANSITIONS[order!.status ?? 'pending']?.map(t => t.status) ?? [];
    if (!validTransitions.includes(newStatus)) return;

    const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
    if (newStatus === 'shipped' && trackingCode) {
      updateData.trackingCode = trackingCode;
      updateData.shippedAt = new Date();
    }
    if (newStatus === 'delivered') updateData.deliveredAt = new Date();

    await db.update(orders).set(updateData).where(and(eq(orders.tenantId, tid), eq(orders.id, id)));
    await db.insert(orderEvents).values({
      orderId: id,
      tenantId: tid,
      eventType: 'status_changed',
      fromStatus: order!.status,
      toStatus: newStatus,
      actor: 'admin',
      notes,
    });

    revalidatePath(`/pedidos/${id}`);
    revalidatePath('/pedidos');
  }

  const statusBadgeClass =
    order.status === 'paid' || order.status === 'delivered' ? 'lj-badge lj-badge-success' :
    order.status === 'cancelled' ? 'lj-badge lj-badge-neutral' :
    order.status === 'shipped' || order.status === 'preparing' ? 'lj-badge lj-badge-info' :
    'lj-badge lj-badge-warning';

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="min-h-screen space-y-6">
      <Link href="/pedidos" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Pedidos
      </Link>

      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
            {order.orderNumber}
          </h1>
          <p className="body-s">
            {new Date(order.createdAt!).toLocaleString('pt-BR')} · <span className={statusBadgeClass}>{STATUS_LABEL[order.status ?? 'pending']}</span>
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Main content */}
        <div className="space-y-6" style={{ minWidth: 0 }}>
          {/* Items */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Itens do pedido</h2>
            <div>
              {items.map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-3) 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.productName} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--w-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                    {item.variantName && <p className="caption">{item.variantName}</p>}
                    {item.sku && <p className="caption mono">SKU: {item.sku}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="numeric body-s">{item.qty}× {fmt(item.unitPriceCents ?? 0)}</p>
                    <p className="numeric" style={{ fontWeight: 'var(--w-medium)' }}>{fmt((item.unitPriceCents ?? 0) * (item.qty ?? 1))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }} className="space-y-1">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="body-s">Subtotal</span>
                <span className="numeric body-s">{fmt(order.subtotalCents ?? 0)}</span>
              </div>
              {(order.discountCents ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span className="body-s">Desconto Pix</span>
                  <span className="numeric body-s">−{fmt(order.discountCents ?? 0)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="body-s">Frete</span>
                <span className="numeric body-s">{fmt(order.shippingCents ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'var(--w-semibold)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)', fontSize: 'var(--text-body)' }}>
                <span>Total</span>
                <span className="numeric">{fmt(order.totalCents ?? 0)}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Histórico</h2>
            <ol className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map(ev => (
                <li key={ev.id} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <span className="caption numeric" style={{ flexShrink: 0, minWidth: 90 }}>
                    {new Date(ev.createdAt!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="body-s" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'var(--w-medium)', textTransform: 'capitalize' }}>{ev.eventType?.replace(/_/g, ' ')}</span>
                    {ev.fromStatus && ev.toStatus && (
                      <span style={{ color: 'var(--fg-secondary)' }}> · {STATUS_LABEL[ev.fromStatus]} → {STATUS_LABEL[ev.toStatus]}</span>
                    )}
                    {ev.notes && <p className="caption" style={{ marginTop: 2 }}>{ev.notes}</p>}
                    <span className="caption" style={{ marginLeft: 'var(--space-1)' }}>por {ev.actor}</span>
                  </div>
                </li>
              ))}
              {events.length === 0 && (
                <li className="body-s" style={{ color: 'var(--fg-secondary)' }}>Nenhum evento registrado.</li>
              )}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status update */}
          {nextSteps.length > 0 && (
            <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Atualizar status</h2>
              {nextSteps.map((step, i) => (
                <form key={step.status} action={updateStatus} style={{ marginBottom: i === nextSteps.length - 1 ? 0 : 'var(--space-4)' }}>
                  <input type="hidden" name="status" value={step.status} />
                  {step.status === 'shipped' && (
                    <input
                      type="text"
                      name="trackingCode"
                      placeholder="Código de rastreio (opcional)"
                      className="lj-input"
                      style={{ width: '100%', marginBottom: 'var(--space-2)' }}
                    />
                  )}
                  <input
                    type="text"
                    name="notes"
                    placeholder="Observação (opcional)"
                    className="lj-input"
                    style={{ width: '100%', marginBottom: 'var(--space-2)' }}
                  />
                  <button
                    type="submit"
                    className={step.status === 'cancelled' ? 'lj-btn-danger' : 'lj-btn-primary'}
                    style={{ width: '100%' }}
                  >
                    {step.label}
                  </button>
                </form>
              ))}
            </section>
          )}

          {/* Shipping info */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Endereço de entrega</h2>
            {addr ? (
              <address className="body-s" style={{ fontStyle: 'normal' }}>
                <p style={{ fontWeight: 'var(--w-medium)' }}>{addr.recipientName}</p>
                <p>{addr.street}, {addr.number} {addr.complement ?? ''}</p>
                <p>{addr.neighborhood}</p>
                <p>{addr.city} — {addr.state}</p>
                <p className="numeric">CEP {addr.postalCode}</p>
                {addr.phone && <p className="numeric" style={{ color: 'var(--fg-secondary)' }}>{addr.phone}</p>}
              </address>
            ) : (
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Endereço não disponível</p>
            )}
          </section>

          {/* Payment info */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Pagamento</h2>
            <dl className="body-s space-y-1">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Método</dt>
                <dd style={{ textTransform: 'uppercase' }}>{order.paymentMethod?.replace('_', ' ')}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Gateway</dt>
                <dd>{order.paymentGateway ?? '—'}</dd>
              </div>
              {order.trackingCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--fg-secondary)' }}>Rastreio</dt>
                  <dd className="mono">{order.trackingCode}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
