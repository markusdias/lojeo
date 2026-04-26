import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, orders, orderItems, customerAddresses, products } from '@lojeo/db';
import { computeWarrantyBatch } from '@lojeo/engine';
import { eq, and, desc, or, inArray } from 'drizzle-orm';
import { auth } from '../../auth';
import { WishlistCount } from '../../components/account/wishlist-count';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Em preparação',
  shipped: 'A caminho',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const OPEN_STATUSES = new Set(['pending', 'paid', 'preparing', 'shipped']);

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function daysSince(d: Date | null | undefined) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function firstName(name: string | null | undefined, email: string | null | undefined) {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  if (email) return email.split('@')[0];
  return 'cliente';
}

// ── Icons ──────────────────────────────────────────────────────────────────
function HeartIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ── Server data ────────────────────────────────────────────────────────────
async function loadDashboard(userId: string | undefined, email: string | null | undefined) {
  const tid = tenantId();
  const empty = {
    ordersCount: 0,
    openOrdersCount: 0,
    addressesCount: 0,
    activeWarrantiesCount: 0,
    lastOrder: null as null | {
      id: string;
      orderNumber: string;
      productName: string;
      imageUrl: string | null;
      status: string;
      statusLabel: string;
      trackingCode: string | null;
      etaLabel: string | null;
    },
    lastOrderItemName: null as string | null,
  };
  if (!userId && !email) return empty;

  // Orders
  const conditions = [eq(orders.tenantId, tid)];
  if (userId && email) {
    conditions.push(or(eq(orders.userId, userId), eq(orders.customerEmail, email))!);
  } else if (userId) {
    conditions.push(eq(orders.userId, userId));
  } else if (email) {
    conditions.push(eq(orders.customerEmail, email));
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(50)
    .catch(() => []);

  const orderIds = orderRows.map(o => o.id);
  const items = orderIds.length
    ? await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.tenantId, tid), inArray(orderItems.orderId, orderIds)))
        .catch(() => [])
    : [];

  // Addresses
  const addressesRows = userId
    ? await db
        .select({ id: customerAddresses.id })
        .from(customerAddresses)
        .where(and(eq(customerAddresses.tenantId, tid), eq(customerAddresses.userId, userId)))
        .catch(() => [])
    : [];

  // Warranties via engine
  const productNames = Array.from(new Set(items.map(i => i.productName)));
  const productLookup = productNames.length
    ? await db
        .select({ name: products.name, warrantyMonths: products.warrantyMonths })
        .from(products)
        .where(and(eq(products.tenantId, tid), inArray(products.name, productNames)))
        .catch(() => [])
    : [];
  const warrantyMonthsByName = new Map(productLookup.map(p => [p.name, p.warrantyMonths ?? 0]));

  const warrantyInputs = items
    .map(it => {
      const order = orderRows.find(o => o.id === it.orderId);
      if (!order) return null;
      const startsAt = order.deliveredAt ?? order.createdAt;
      return {
        orderId: it.orderId,
        orderItemId: it.id,
        productId: null,
        productName: it.productName,
        warrantyMonths: warrantyMonthsByName.get(it.productName) ?? null,
        startsAt: new Date(startsAt),
      };
    })
    .filter(Boolean) as Parameters<typeof computeWarrantyBatch>[0];

  const warranties = computeWarrantyBatch(warrantyInputs);
  const activeWarrantiesCount = warranties.filter(
    w => w.status === 'active' || w.status === 'expiring_soon',
  ).length;

  // Last order (open ou mais recente)
  const lastOrderRow =
    orderRows.find(o => OPEN_STATUSES.has(o.status)) ?? orderRows[0] ?? null;

  let lastOrder = empty.lastOrder;
  if (lastOrderRow) {
    const lastItems = items.filter(i => i.orderId === lastOrderRow.id);
    const firstItem = lastItems[0];
    let etaLabel: string | null = null;
    if (lastOrderRow.status === 'shipped' && lastOrderRow.shippingDeadlineDays) {
      const eta = new Date(
        (lastOrderRow.shippedAt ?? lastOrderRow.createdAt).valueOf() +
          lastOrderRow.shippingDeadlineDays * 24 * 60 * 60 * 1000,
      );
      etaLabel = `prevista ${fmtDate(eta)}`;
    } else if (lastOrderRow.deliveredAt) {
      etaLabel = `entregue ${fmtDate(new Date(lastOrderRow.deliveredAt))}`;
    }
    lastOrder = {
      id: lastOrderRow.id,
      orderNumber: lastOrderRow.orderNumber,
      productName: firstItem?.productName ?? 'Pedido',
      imageUrl: firstItem?.imageUrl ?? null,
      status: lastOrderRow.status,
      statusLabel: STATUS_LABEL[lastOrderRow.status] ?? lastOrderRow.status,
      trackingCode: lastOrderRow.trackingCode,
      etaLabel,
    };
  }

  return {
    ordersCount: orderRows.length,
    openOrdersCount: orderRows.filter(o => OPEN_STATUSES.has(o.status)).length,
    addressesCount: addressesRows.length,
    activeWarrantiesCount,
    lastOrder,
    lastOrderItemName: lastOrder?.productName ?? null,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function ContaHomePage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect('/entrar?next=/conta');
  }
  if (!session?.user) redirect('/entrar?next=/conta');

  const name = firstName(session.user.name, session.user.email);
  const dashboard = await loadDashboard(session.user.id, session.user.email).catch(() => ({
    ordersCount: 0,
    openOrdersCount: 0,
    addressesCount: 0,
    activeWarrantiesCount: 0,
    lastOrder: null as Awaited<ReturnType<typeof loadDashboard>>['lastOrder'],
    lastOrderItemName: null,
  }));

  const last = (session.user as { lastVisit?: string | Date | null } | undefined)?.lastVisit;
  const lastVisitDays = daysSince(last as Date | null | undefined);

  const shortcuts: Array<{
    icon: React.ReactNode;
    title: string;
    sub: React.ReactNode;
    href: string;
  }> = [
    {
      icon: <HeartIcon />,
      title: 'Wishlist',
      sub: <WishlistCount />,
      href: '/wishlist',
    },
    {
      icon: <BoxIcon />,
      title: 'Pedidos',
      sub:
        dashboard.openOrdersCount > 0
          ? `${dashboard.openOrdersCount} ${dashboard.openOrdersCount === 1 ? 'aberto' : 'abertos'}`
          : dashboard.ordersCount > 0
          ? `${dashboard.ordersCount} no histórico`
          : 'nenhum ainda',
      href: '/conta/pedidos',
    },
    {
      icon: <MapPinIcon />,
      title: 'Endereços',
      sub:
        dashboard.addressesCount > 0
          ? `${dashboard.addressesCount} ${dashboard.addressesCount === 1 ? 'salvo' : 'salvos'}`
          : 'nenhum salvo',
      href: '/conta/enderecos',
    },
    {
      icon: <ShieldIcon />,
      title: 'Garantias',
      sub:
        dashboard.activeWarrantiesCount > 0
          ? `${dashboard.activeWarrantiesCount} ${dashboard.activeWarrantiesCount === 1 ? 'ativa' : 'ativas'}`
          : 'sem ativas',
      href: '/conta/pedidos',
    },
  ];

  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 44px)',
            lineHeight: 1.05,
            margin: 0,
            color: 'var(--text-primary)',
            fontWeight: 400,
          }}
        >
          Olá, {name}.
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 15 }}>
          {lastVisitDays != null
            ? `Última visita há ${lastVisitDays} ${lastVisitDays === 1 ? 'dia' : 'dias'}.`
            : 'Bom te ver de volta.'}
        </p>
      </header>

      {/* Shortcuts grid */}
      <section
        aria-label="Atalhos da conta"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 36,
        }}
      >
        {shortcuts.map(s => (
          <Link
            key={s.title}
            href={s.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 18,
              background: 'var(--surface)',
              border: '1px solid var(--divider)',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms, transform 150ms',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>{s.icon}</span>
            <span style={{ fontWeight: 500, fontSize: 15 }}>{s.title}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.sub}</span>
          </Link>
        ))}
      </section>

      {/* Última peça (se houver) */}
      {dashboard.lastOrder && (
        <section style={{ marginBottom: 36 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 400,
              margin: '0 0 14px',
              color: 'var(--text-primary)',
            }}
          >
            Última peça
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '72px 1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: 18,
              background: 'var(--surface)',
              borderRadius: 8,
              border: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                aspectRatio: '1 / 1',
                background: 'var(--surface-sunken)',
                borderRadius: 4,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dashboard.lastOrder.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dashboard.lastOrder.imageUrl}
                  alt={dashboard.lastOrder.productName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 24, color: 'var(--text-muted)' }}>◆</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  margin: 0,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {dashboard.lastOrder.productName}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {dashboard.lastOrder.statusLabel}
                {dashboard.lastOrder.etaLabel ? ` · ${dashboard.lastOrder.etaLabel}` : ''}
              </p>
            </div>
            <Link
              href={
                dashboard.lastOrder.trackingCode
                  ? `/rastreio/${dashboard.lastOrder.trackingCode}`
                  : `/conta/pedidos/${dashboard.lastOrder.id}`
              }
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--text-primary)',
                color: 'var(--text-on-dark)',
                borderRadius: 4,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {dashboard.lastOrder.trackingCode
                ? `Rastrear · ${dashboard.lastOrder.trackingCode}`
                : 'Ver pedido'}
            </Link>
          </div>
        </section>
      )}

      {/* Pensa pra você (placeholder) */}
      <section>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            margin: '0 0 14px',
            color: 'var(--text-primary)',
          }}
        >
          Pensa pra você
        </h2>
        <div
          style={{
            background: 'var(--accent-soft)',
            padding: 24,
            borderRadius: 8,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div>
            <p
              className="eyebrow"
              style={{ marginBottom: 6, color: 'var(--accent)' }}
            >
              Sugestão
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              {dashboard.lastOrderItemName
                ? `Quem ama ${dashboard.lastOrderItemName.toLowerCase()} também leva...`
                : 'Descubra peças sob medida pra você.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              Recomendações baseadas no seu histórico chegam aqui em breve.
            </p>
          </div>
          <Link
            href="/produtos"
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--text-primary)',
              borderRadius: 4,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ver coleção
          </Link>
        </div>
      </section>
    </div>
  );
}
