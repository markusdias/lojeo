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

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/pedidos" className="text-sm text-neutral-500 hover:text-neutral-900">← Pedidos</Link>
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-neutral-500">
            {new Date(order.createdAt!).toLocaleString('pt-BR')} · {STATUS_LABEL[order.status ?? 'pending']}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Items */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold mb-4">Itens do pedido</h2>
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-neutral-500">{item.variantName}</p>}
                    {item.sku && <p className="text-xs text-neutral-400">SKU: {item.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm">{item.qty}× {fmt(item.unitPriceCents ?? 0)}</p>
                    <p className="font-medium">{fmt((item.unitPriceCents ?? 0) * (item.qty ?? 1))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 mt-2 space-y-1 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span><span>{fmt(order.subtotalCents ?? 0)}</span>
              </div>
              {(order.discountCents ?? 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Desconto Pix</span><span>−{fmt(order.discountCents ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Frete</span><span>{fmt(order.shippingCents ?? 0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span><span>{fmt(order.totalCents ?? 0)}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold mb-4">Histórico</h2>
            <ol className="space-y-3">
              {events.map(ev => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-neutral-400 shrink-0">
                    {new Date(ev.createdAt!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <span className="font-medium capitalize">{ev.eventType?.replace(/_/g, ' ')}</span>
                    {ev.fromStatus && ev.toStatus && (
                      <span className="text-neutral-500"> · {STATUS_LABEL[ev.fromStatus]} → {STATUS_LABEL[ev.toStatus]}</span>
                    )}
                    {ev.notes && <p className="text-neutral-500 text-xs mt-0.5">{ev.notes}</p>}
                    <span className="text-xs text-neutral-400 ml-1">por {ev.actor}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status update */}
          {nextSteps.length > 0 && (
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">Atualizar status</h2>
              {nextSteps.map(step => (
                <form key={step.status} action={updateStatus} className="mb-4 last:mb-0">
                  <input type="hidden" name="status" value={step.status} />
                  {step.status === 'shipped' && (
                    <input
                      type="text"
                      name="trackingCode"
                      placeholder="Código de rastreio (opcional)"
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                    />
                  )}
                  <input
                    type="text"
                    name="notes"
                    placeholder="Observação (opcional)"
                    className="w-full border rounded px-3 py-2 text-sm mb-2"
                  />
                  <button
                    type="submit"
                    className={`w-full py-2 px-4 rounded text-sm font-medium ${step.status === 'cancelled' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
                  >
                    {step.label}
                  </button>
                </form>
              ))}
            </section>
          )}

          {/* Shipping info */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold mb-3">Endereço de entrega</h2>
            {addr ? (
              <address className="text-sm text-neutral-700 not-italic space-y-0.5">
                <p className="font-medium">{addr.recipientName}</p>
                <p>{addr.street}, {addr.number} {addr.complement ?? ''}</p>
                <p>{addr.neighborhood}</p>
                <p>{addr.city} — {addr.state}</p>
                <p>CEP {addr.postalCode}</p>
                {addr.phone && <p className="text-neutral-500">{addr.phone}</p>}
              </address>
            ) : (
              <p className="text-sm text-neutral-400">Endereço não disponível</p>
            )}
          </section>

          {/* Payment info */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold mb-3">Pagamento</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Método</dt>
                <dd className="uppercase">{order.paymentMethod?.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Gateway</dt>
                <dd>{order.paymentGateway ?? '—'}</dd>
              </div>
              {order.trackingCode && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Rastreio</dt>
                  <dd className="font-mono">{order.trackingCode}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
