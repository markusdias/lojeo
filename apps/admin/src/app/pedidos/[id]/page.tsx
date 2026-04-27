import { auth } from '../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db, orders, orderItems, orderEvents } from '@lojeo/db';
import { eq, and, asc, not, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { scoreCustomers, SEGMENT_LABELS, type RfmSegment } from '@lojeo/engine';
import { IssueInvoiceButton } from './issue-invoice-button';

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

const STATUS_ORDER = ['paid', 'preparing', 'shipped', 'in_transit', 'delivered'] as const;

const SEGMENT_GRADIENT: Record<RfmSegment, string> = {
  champions: 'linear-gradient(135deg, #00553D, #34C796)',
  loyal:     'linear-gradient(135deg, #1E40AF, #3B82F6)',
  at_risk:   'linear-gradient(135deg, #B45309, #F59E0B)',
  lost:      'linear-gradient(135deg, #6B7280, #9CA3AF)',
  new:       'linear-gradient(135deg, #6D28D9, #A855F7)',
  promising: 'linear-gradient(135deg, #0E7490, #06B6D4)',
  other:     'linear-gradient(135deg, #475569, #94A3B8)',
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDateTime(d: Date) {
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(source: string): string {
  const parts = source.trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
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

  // ── Customer aggregate (LTV / orderCount / RFM) ─────────────────────────────
  // Server component: faz query SQL agregada igual a /clientes/[email]/page.tsx.
  // Não tem chamada client — tudo vem em uma única request server-side.
  const customerEmail = order.customerEmail ?? null;
  const recipientName = (addr?.recipientName as string | undefined) ?? null;
  const displayName = recipientName ?? (customerEmail ? customerEmail.split('@')[0] ?? customerEmail : 'Cliente');

  let customerSegment: RfmSegment = 'other';
  let customerLtvCents = 0;
  let customerOrderCount = 0;
  let customerAvgTicketCents = 0;
  let recencyDays: number | null = null;

  if (customerEmail) {
    const [agg] = await db
      .select({
        orderCount: sql<number>`cast(count(*) as int)`,
        totalCents: sql<number>`cast(coalesce(sum(${orders.totalCents}), 0) as int)`,
        lastOrderAt: sql<string>`max(${orders.createdAt})`,
        firstOrderAt: sql<string>`min(${orders.createdAt})`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tid),
          eq(orders.customerEmail, customerEmail),
          not(eq(orders.status, 'cancelled')),
        )
      );

    if (agg && agg.orderCount > 0 && agg.lastOrderAt && agg.firstOrderAt) {
      const profiles = scoreCustomers([{
        email: customerEmail,
        userId: order.userId ?? null,
        orderCount: agg.orderCount,
        totalCents: agg.totalCents,
        lastOrderAt: new Date(agg.lastOrderAt),
        firstOrderAt: new Date(agg.firstOrderAt),
      }]);
      const profile = profiles[0];
      if (profile) {
        customerSegment = profile.segment;
        customerLtvCents = profile.totalCents;
        customerOrderCount = profile.orderCount;
        customerAvgTicketCents = profile.orderCount > 0 ? Math.round(profile.totalCents / profile.orderCount) : 0;
        recencyDays = profile.daysSinceLastOrder;
      }
    }
  }

  // ── Server action: avançar status ────────────────────────────────────────────
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

  // ── Timeline horizontal: 5 etapas ────────────────────────────────────────────
  // Pago → Em separação → Enviado → Em trânsito → Entregue
  // "done" baseado em status atual; datetime onde temos timestamp real, senão "previsto".
  const currentStatus = order.status ?? 'pending';
  const statusRank: Record<string, number> = {
    pending: -1, paid: 0, preparing: 1, shipped: 2, delivered: 4, cancelled: 0,
  };
  const currentRank = statusRank[currentStatus] ?? -1;

  const eventByStatus = new Map<string, Date>();
  for (const ev of events) {
    if (ev.toStatus && ev.createdAt) {
      eventByStatus.set(ev.toStatus, ev.createdAt instanceof Date ? ev.createdAt : new Date(ev.createdAt as unknown as string));
    }
  }

  const timelineSteps = STATUS_ORDER.map((step, idx) => {
    const done = idx <= currentRank;
    const isCurrent = idx === currentRank;
    let when: string;
    if (step === 'paid') {
      when = done ? fmtDateTime(order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as unknown as string)) : '—';
    } else if (step === 'preparing') {
      const evt = eventByStatus.get('preparing');
      when = done ? (evt ? fmtDateTime(evt) : '—') : 'previsto';
    } else if (step === 'shipped') {
      const ts = order.shippedAt ? (order.shippedAt instanceof Date ? order.shippedAt : new Date(order.shippedAt as unknown as string)) : eventByStatus.get('shipped') ?? null;
      when = done ? (ts ? fmtDateTime(ts) : '—') : 'previsto';
    } else if (step === 'in_transit') {
      // sem campo dedicado: se enviado mas não entregue, "agora" / em trânsito
      if (currentStatus === 'shipped') when = 'em trânsito';
      else if (currentStatus === 'delivered') when = '—';
      else when = 'previsto';
    } else {
      // delivered
      const ts = order.deliveredAt ? (order.deliveredAt instanceof Date ? order.deliveredAt : new Date(order.deliveredAt as unknown as string)) : null;
      when = done ? (ts ? fmtDateTime(ts) : '—') : 'previsto';
    }
    const labelMap: Record<string, string> = {
      paid: 'Pago',
      preparing: 'Em separação',
      shipped: 'Enviado',
      in_transit: 'Em trânsito',
      delivered: 'Entregue',
    };
    const doneForRender =
      step === 'in_transit'
        ? currentStatus === 'shipped' || currentStatus === 'delivered'
        : done;
    const currentForRender =
      step === 'in_transit'
        ? currentStatus === 'shipped'
        : isCurrent;
    return { key: step, label: labelMap[step] ?? step, when, done: doneForRender, current: currentForRender };
  });

  // CTA primário no header: avança pro próximo status real (preferindo "delivered").
  const primaryNext = nextSteps.find(s => s.status === 'delivered')
    ?? nextSteps.find(s => s.status !== 'cancelled')
    ?? null;
  const primaryLabel = primaryNext?.status === 'delivered' ? 'Marcar como entregue' : (primaryNext?.label ?? 'Pedido finalizado');

  // ── Resumo do card "Itens" ───────────────────────────────────────────────────
  const subtotalCents = order.subtotalCents ?? 0;
  const discountCents = order.discountCents ?? 0;
  const couponDiscountCents = order.couponDiscountCents ?? 0;
  const couponCode = order.couponCode ?? null;
  const shippingCents = order.shippingCents ?? 0;
  const totalCents = order.totalCents ?? 0;

  const carrierLabel = [order.shippingCarrier, order.shippingService].filter(Boolean).join(' ') || 'Correios Sedex';

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="min-h-screen space-y-6">
      {/* Header pixel-perfect: eyebrow + h1 mono + 3 botões */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Pedido</p>
          <h1 className="mono" style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
            #{order.orderNumber}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button type="button" className="lj-btn-secondary">Imprimir etiqueta</button>
          <button type="button" className="lj-btn-secondary">Reembolsar</button>
          {primaryNext ? (
            <form action={updateStatus} style={{ display: 'inline-block' }}>
              <input type="hidden" name="status" value={primaryNext.status} />
              <button type="submit" className="lj-btn-primary">{primaryLabel}</button>
            </form>
          ) : (
            <button type="button" className="lj-btn-primary" disabled>Pedido finalizado</button>
          )}
        </div>
      </header>

      {/* Layout 2 colunas: main 2fr / sidebar 1fr */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* MAIN COLUMN */}
        <div className="space-y-6" style={{ minWidth: 0 }}>
          {/* Card "Linha do tempo" — horizontal SVG */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)' }}>Linha do tempo</h2>
              <span className="caption">timezone: BRT</span>
            </div>
            <HorizontalTimeline steps={timelineSteps} />
          </section>

          {/* Card "Cliente" */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Cliente</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div
                aria-hidden
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: SEGMENT_GRADIENT[customerSegment],
                  color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 'var(--w-semibold)',
                  flexShrink: 0,
                }}
              >
                {initials(recipientName ?? customerEmail ?? '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 'var(--w-semibold)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p className="body-s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {customerEmail ?? '—'}
                  {customerOrderCount > 0 && (
                    <> · {customerOrderCount}º pedido</>
                  )}
                </p>
              </div>
              {customerSegment === 'champions' && (
                <span className="lj-badge lj-badge-accent" style={{ flexShrink: 0 }}>VIP</span>
              )}
              {customerSegment === 'at_risk' && (
                <span className="lj-badge lj-badge-warning" style={{ flexShrink: 0 }}>em risco</span>
              )}
              {customerSegment === 'new' && (
                <span className="lj-badge lj-badge-info" style={{ flexShrink: 0 }}>novo</span>
              )}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-3)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border)',
            }}>
              <div>
                <p className="caption">LTV</p>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{fmt(customerLtvCents)}</p>
              </div>
              <div>
                <p className="caption">Ticket médio</p>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{fmt(customerAvgTicketCents)}</p>
              </div>
              <div>
                <p className="caption">RFM</p>
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--w-medium)' }}>
                  {customerOrderCount > 0
                    ? `${SEGMENT_LABELS[customerSegment]}${recencyDays !== null ? ` · ${recencyDays}d` : ''}`
                    : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Card "Endereço de entrega" — mantido, design não rejeita */}
          {addr && (
            <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Endereço de entrega</h2>
              <address className="body-s" style={{ fontStyle: 'normal' }}>
                <p style={{ fontWeight: 'var(--w-medium)', color: 'var(--fg)' }}>{addr.recipientName}</p>
                <p>{addr.street}, {addr.number} {addr.complement ?? ''}</p>
                <p>{addr.neighborhood}</p>
                <p>{addr.city} — {addr.state}</p>
                <p className="numeric">CEP {addr.postalCode}</p>
                {addr.phone && <p className="numeric">{addr.phone}</p>}
              </address>
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {/* Card "Itens" compacto */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Itens</h2>
            <div className="space-y-2" style={{ marginBottom: 'var(--space-4)' }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'var(--neutral-100)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--w-medium)', fontSize: 'var(--text-body-s)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                    <p className="caption">
                      {item.variantName ? `${item.variantName} · ` : ''}{item.qty} un
                    </p>
                  </div>
                  <p className="numeric body-s" style={{ fontWeight: 'var(--w-medium)', flexShrink: 0 }}>{fmt((item.unitPriceCents ?? 0) * (item.qty ?? 1))}</p>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }} className="space-y-1">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="body-s">Subtotal</span>
                <span className="numeric body-s">{fmt(subtotalCents)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="body-s">Frete ({order.shippingService ?? 'envio'})</span>
                <span className="numeric body-s">{fmt(shippingCents)}</span>
              </div>
              {(couponDiscountCents > 0 || couponCode) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="body-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    Desconto cupom
                    {couponCode && (
                      <code className="mono" style={{
                        fontSize: 11,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'var(--neutral-50)',
                        color: 'var(--fg-secondary)',
                      }}>{couponCode}</code>
                    )}
                  </span>
                  <span className="numeric body-s" style={{ color: 'var(--error)' }}>− {fmt(couponDiscountCents || discountCents)}</span>
                </div>
              )}
              {discountCents > 0 && couponDiscountCents === 0 && !couponCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="body-s">Desconto</span>
                  <span className="numeric body-s" style={{ color: 'var(--error)' }}>− {fmt(discountCents)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontWeight: 'var(--w-semibold)',
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--space-2)',
                marginTop: 'var(--space-1)',
                fontSize: 'var(--text-body)',
              }}>
                <span>Total</span>
                <span className="numeric">{fmt(totalCents)}</span>
              </div>
            </div>
          </section>

          {/* Card "Pagamento & frete" */}
          <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-4)' }}>Pagamento & frete</h2>
            <dl className="body-s space-y-2" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Gateway</dt>
                <dd style={{ margin: 0 }}>
                  <span className="lj-badge lj-badge-success">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    {order.paymentGateway ?? '—'}
                  </span>
                </dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Método</dt>
                <dd style={{ margin: 0, textTransform: 'uppercase', fontWeight: 'var(--w-medium)' }}>{order.paymentMethod?.replace('_', ' ') ?? '—'}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>NF-e</dt>
                <dd style={{ margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {order.invoiceUrl ? (
                    <a href={order.invoiceUrl} target="_blank" rel="noreferrer" className="mono" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {order.invoiceKey ?? `NFe-${order.orderNumber}`}
                    </a>
                  ) : order.invoiceKey ? (
                    <span className="mono" style={{ color: 'var(--accent)' }}>{order.invoiceKey}</span>
                  ) : (
                    <span style={{ color: 'var(--fg-muted)' }}>—</span>
                  )}
                </dd>
              </div>
              <IssueInvoiceButton
                orderId={order.id}
                hasInvoice={Boolean(order.invoiceKey)}
                status={currentStatus}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Transportadora</dt>
                <dd style={{ margin: 0 }}>{carrierLabel}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                <dt style={{ color: 'var(--fg-secondary)' }}>Rastreio</dt>
                <dd style={{ margin: 0 }}>
                  {order.trackingCode ? (
                    <span className="mono">{order.trackingCode}</span>
                  ) : (
                    <span style={{ color: 'var(--fg-muted)' }}>—</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Card "Atualizar status" — operação completa (mantido pra fluxo MEI) */}
          {nextSteps.length > 0 && (
            <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Atualizar status</h2>
              <p className="body-s" style={{ marginBottom: 'var(--space-3)' }}>
                Atual: <span className="lj-badge lj-badge-info">{STATUS_LABEL[currentStatus] ?? currentStatus}</span>
              </p>
              {nextSteps.map((step, i) => (
                <form key={step.status} action={updateStatus} style={{ marginBottom: i === nextSteps.length - 1 ? 0 : 'var(--space-3)' }}>
                  <input type="hidden" name="status" value={step.status} />
                  {step.status === 'shipped' && (
                    <input
                      type="text"
                      name="trackingCode"
                      placeholder="Código de rastreio (opcional)"
                      className="lj-input"
                      style={{ marginBottom: 'var(--space-2)' }}
                    />
                  )}
                  <input
                    type="text"
                    name="notes"
                    placeholder="Observação (opcional)"
                    className="lj-input"
                    style={{ marginBottom: 'var(--space-2)' }}
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
        </div>
      </div>
    </main>
  );
}

// ── Timeline component (SVG inline, server-rendered) ──────────────────────────

interface TimelineStep {
  key: string;
  label: string;
  when: string;
  done: boolean;
  current: boolean;
}

function HorizontalTimeline({ steps }: { steps: TimelineStep[] }) {
  const accent = 'var(--accent)';
  const border = 'var(--border)';
  const dotSize = 14;

  return (
    <div style={{ position: 'relative' }}>
      {/* Linha horizontal de conexão (atrás dos dots) */}
      <div
        style={{
          position: 'absolute',
          top: dotSize / 2,
          left: `calc(100% / ${steps.length} / 2)`,
          right: `calc(100% / ${steps.length} / 2)`,
          height: 2,
          background: border,
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* Linha "preenchida" até o último step done */}
      {(() => {
        const lastDoneIdx = steps.reduce((acc, s, i) => (s.done ? i : acc), -1);
        if (lastDoneIdx <= 0) return null;
        const pct = (lastDoneIdx / (steps.length - 1)) * 100;
        return (
          <div
            style={{
              position: 'absolute',
              top: dotSize / 2,
              left: `calc(100% / ${steps.length} / 2)`,
              width: `calc((100% - 100% / ${steps.length}) * ${pct / 100})`,
              height: 2,
              background: accent,
              zIndex: 0,
              transition: 'width 200ms ease',
            }}
            aria-hidden
          />
        );
      })()}

      {/* Dots + labels */}
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
          listStyle: 'none',
          padding: 0,
          margin: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {steps.map(step => {
          const filled = step.done;
          const isCurrent = step.current;
          return (
            <li
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                padding: '0 4px',
                minWidth: 0,
              }}
            >
              <svg
                width={dotSize}
                height={dotSize}
                viewBox="0 0 14 14"
                aria-hidden
                style={{
                  flexShrink: 0,
                  borderRadius: '50%',
                  boxShadow: isCurrent ? '0 0 0 4px var(--accent-soft)' : 'none',
                  transition: 'box-shadow 200ms ease',
                }}
              >
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  fill={filled ? accent : 'var(--bg-elevated)'}
                  stroke={filled ? accent : border}
                  strokeWidth="2"
                />
              </svg>
              <div style={{ minWidth: 0, width: '100%' }}>
                <p
                  style={{
                    fontSize: 'var(--text-body-s)',
                    fontWeight: isCurrent ? 'var(--w-semibold)' : 'var(--w-medium)',
                    color: filled ? 'var(--fg)' : 'var(--fg-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </p>
                <p className="caption numeric" style={{ marginTop: 2 }}>{step.when}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
