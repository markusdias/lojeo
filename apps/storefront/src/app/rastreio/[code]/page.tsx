import { db, orders, orderEvents } from '@lojeo/db';
import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { TrackingMap } from '../../../components/tracking/tracking-map';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Steps oficiais do fluxo de rastreamento branded.
const TRACKING_STEPS = ['pending', 'paid', 'preparing', 'shipped', 'delivered'] as const;
type TrackingStep = (typeof TRACKING_STEPS)[number];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  preparing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_DESCRIPTION: Record<TrackingStep, string> = {
  pending: 'Recebemos seu pedido e estamos aguardando a confirmação do pagamento.',
  paid: 'Seu pagamento foi aprovado. Já estamos preparando tudo com carinho.',
  preparing: 'Sua peça está sendo embalada no ateliê com nosso cuidado de costume.',
  shipped: 'Seu pedido saiu para entrega. Agora é só aguardar o carteiro.',
  delivered: 'Seu pedido foi entregue. Esperamos que você ame cada detalhe.',
};

const STATUS_ICON: Record<string, string> = {
  pending: '◉',
  paid: '✓',
  preparing: '◈',
  shipped: '→',
  delivered: '✓',
  cancelled: '✕',
};

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  if (user.length <= 4) return `${user[0] ?? ''}***@${domain}`;
  return `${user.slice(0, 4)}***@${domain}`;
}

function maskName(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0]!;
    return p.length <= 2 ? p : `${p.slice(0, 2)}***`;
  }
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${first} ${(last[0] ?? '').toUpperCase()}.`;
}

interface PageProps {
  params: Promise<{ code: string }>;
}

function NotFoundView({ code }: { code: string }) {
  return (
    <div style={{
      maxWidth: 'var(--container-max)', margin: '0 auto',
      padding: '64px var(--container-pad) 96px',
    }}>
      <div style={{
        maxWidth: 520, margin: '0 auto',
        background: 'var(--surface)', border: '1px solid var(--divider)',
        borderRadius: 12, padding: '40px 32px', textAlign: 'center',
      }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Rastreamento</p>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>
          Não encontramos esse pedido
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
          Confira o número informado. Pedidos têm o formato <strong>LJ-XXXXX</strong> e aparecem no
          email de confirmação. Você buscou: <code style={{ fontFamily: 'var(--font-mono)' }}>{code}</code>
        </p>

        <form action="/rastreio" method="get" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            name="code"
            placeholder="LJ-00042"
            defaultValue={code}
            autoComplete="off"
            style={{
              width: '100%', padding: '14px 16px', fontSize: 15,
              background: 'var(--surface-sunken)', border: '1px solid var(--divider)',
              borderRadius: 8, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.05em',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '14px 24px', fontSize: 14, fontWeight: 500,
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Rastrear pedido
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          Não tem o número?{' '}
          <Link href="/conta/pedidos" style={{ color: 'var(--accent)' }}>
            Entrar na minha conta
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function RastreioCodePage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase();
  const tid = tenantId();

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tid), eq(orders.orderNumber, code)))
    .limit(1);

  if (!order) {
    return <NotFoundView code={code} />;
  }

  const events = await db
    .select()
    .from(orderEvents)
    .where(and(eq(orderEvents.tenantId, tid), eq(orderEvents.orderId, order.id)))
    .orderBy(asc(orderEvents.createdAt));

  // Map: para cada step do fluxo, encontrar o evento mais recente que entrou nesse step.
  const stepReachedAt = new Map<TrackingStep, Date>();
  for (const ev of events) {
    const to = ev.toStatus as TrackingStep | null;
    if (to && (TRACKING_STEPS as readonly string[]).includes(to)) {
      stepReachedAt.set(to, ev.createdAt);
    }
  }

  // Status atual no fluxo (cancelled tratado à parte)
  const currentStatus = order.status as TrackingStep | 'cancelled';
  const currentIndex = TRACKING_STEPS.indexOf(currentStatus as TrackingStep);

  const shipping = order.shippingAddress as { recipientName?: string; city?: string; state?: string } | null;
  const customerName = maskName(shipping?.recipientName);
  const customerEmail = maskEmail(order.customerEmail);

  // Origem do mapa: estado/cidade do tenant (atelier). Sem config, fallback SP.
  const originCity = process.env.NEXT_PUBLIC_TENANT_CITY ?? 'São Paulo';
  const originState = process.env.NEXT_PUBLIC_TENANT_STATE ?? 'SP';

  const isCancelled = order.status === 'cancelled';
  const trackingDescription = !isCancelled && currentIndex >= 0
    ? STATUS_DESCRIPTION[TRACKING_STEPS[currentIndex]!]
    : isCancelled
    ? 'Este pedido foi cancelado. Se precisar de ajuda, entre em contato com o ateliê.'
    : STATUS_LABEL[order.status] ?? order.status;

  return (
    <div style={{
      maxWidth: 'var(--container-max)', margin: '0 auto',
      padding: '48px var(--container-pad) 96px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Rastreamento</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 500, color: 'var(--text-primary)',
              marginBottom: 6, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>
              {order.orderNumber}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Pedido feito em{' '}
              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          <span style={{
            fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 99,
            background: isCancelled ? 'rgba(153, 27, 27, 0.08)' : 'var(--accent-soft)',
            color: isCancelled ? '#991B1B' : 'var(--accent)',
            whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        {/* Frase contextual */}
        <p style={{
          fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: 40, maxWidth: '60ch',
        }}>
          {trackingDescription}
        </p>

        {/* Customer info mascarada */}
        {(customerName || customerEmail) && (
          <div style={{
            background: 'var(--surface-sunken)', borderRadius: 8,
            padding: '12px 16px', marginBottom: 32, display: 'flex',
            flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-secondary)',
          }}>
            {customerName && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Cliente: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{customerName}</strong>
              </div>
            )}
            {customerEmail && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{customerEmail}</strong>
              </div>
            )}
          </div>
        )}

        {/* Mapa branded — match Account.jsx Tracking */}
        {!isCancelled && shipping?.state && (
          <TrackingMap
            origin={{ city: originCity, state: originState }}
            destination={{ city: shipping.city, state: shipping.state }}
          />
        )}

        {/* Timeline visual */}
        <section style={{ marginBottom: 40, marginTop: shipping?.state ? 32 : 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>
            Linha do tempo
          </h2>

          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {TRACKING_STEPS.map((step, i) => {
              const reachedAt = stepReachedAt.get(step);
              const isReached = reachedAt !== undefined || (currentIndex >= 0 && i <= currentIndex);
              const isCurrent = !isCancelled && i === currentIndex;
              const isFuture = !isReached;

              const circleBg = isCurrent
                ? 'var(--accent)'
                : isReached
                ? 'var(--text-primary)'
                : 'var(--surface-sunken)';
              const circleColor = isCurrent || isReached ? 'var(--text-on-dark)' : 'var(--text-muted)';
              const titleColor = isFuture ? 'var(--text-muted)' : 'var(--text-primary)';
              const isLast = i === TRACKING_STEPS.length - 1;

              return (
                <li key={step} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      aria-current={isCurrent ? 'step' : undefined}
                      style={{
                        width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                        background: circleBg,
                        border: isFuture ? '1px solid var(--divider)' : 'none',
                        display: 'grid', placeItems: 'center',
                        fontSize: 13, color: circleColor,
                        boxShadow: isCurrent ? '0 0 0 4px var(--accent-soft)' : 'none',
                        transition: 'box-shadow 200ms',
                      }}
                    >
                      {STATUS_ICON[step]}
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 1, flex: 1, minHeight: 24,
                        background: isReached && stepReachedAt.has(TRACKING_STEPS[i + 1]!) ? 'var(--text-primary)' : 'var(--divider)',
                        margin: '6px 0',
                      }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 28, flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: titleColor, marginBottom: 2 }}>
                      {STATUS_LABEL[step]}
                    </p>
                    {reachedAt && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(reachedAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                    {!reachedAt && isCurrent && (
                      <p style={{ fontSize: 12, color: 'var(--accent)' }}>Etapa atual</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Tracking code externo se shipped */}
        {order.status === 'shipped' && order.trackingCode && (
          <section style={{
            marginBottom: 32, padding: '20px 24px',
            background: 'var(--accent-soft)', borderRadius: 12,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Código de rastreio
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 12 }}>
              {order.trackingCode}
            </p>
            {order.shippingCarrier && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {order.shippingCarrier}
                {order.shippingService ? ` · ${order.shippingService}` : ''}
              </p>
            )}
            <a
              href={`https://www.linkcorreios.com.br/?id=${encodeURIComponent(order.trackingCode)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '10px 20px', fontSize: 13, fontWeight: 500,
                background: 'var(--text-primary)', color: 'var(--text-on-dark)',
                borderRadius: 8, textDecoration: 'none',
              }}
            >
              Acompanhar nos Correios →
            </a>
          </section>
        )}

        {/* Quick actions */}
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          paddingTop: 24, borderTop: '1px solid var(--divider)',
        }}>
          <Link
            href="/rastreio"
            style={{
              padding: '12px 24px', fontSize: 13, fontWeight: 500,
              background: 'var(--surface-sunken)', color: 'var(--text-primary)',
              borderRadius: 8, textDecoration: 'none',
            }}
          >
            Rastrear outro pedido
          </Link>
          <Link
            href="/produtos"
            style={{
              padding: '12px 24px', fontSize: 13, fontWeight: 500,
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              borderRadius: 8, textDecoration: 'none',
            }}
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
