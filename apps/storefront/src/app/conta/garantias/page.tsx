// /conta/garantias — visual de cobertura de garantia (ref Account.jsx AccountWarranty)
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { db, orders, orderItems, products } from '@lojeo/db';
import { computeWarrantyBatch } from '@lojeo/engine';
import { eq, and, desc, or, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmtBRDate(d: Date | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function GarantiasPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect('/entrar?next=/conta/garantias');
  }
  if (!session?.user) redirect('/entrar?next=/conta/garantias');

  const tid = tenantId();
  const userId = session.user.id;
  const email = session.user.email;

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
    .limit(100)
    .catch(() => []);

  const orderIds = orderRows.map(o => o.id);
  const items = orderIds.length
    ? await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.tenantId, tid), inArray(orderItems.orderId, orderIds)))
        .catch(() => [])
    : [];

  const productNames = Array.from(new Set(items.map(i => i.productName)));
  const productLookup = productNames.length
    ? await db
        .select({ name: products.name, warrantyMonths: products.warrantyMonths })
        .from(products)
        .where(and(eq(products.tenantId, tid), inArray(products.name, productNames)))
        .catch(() => [])
    : [];
  const warrantyMonthsByName = new Map(productLookup.map(p => [p.name, p.warrantyMonths ?? 0]));

  const inputs = items
    .map(it => {
      const ord = orderRows.find(o => o.id === it.orderId);
      if (!ord) return null;
      const startsAt = ord.deliveredAt ?? ord.createdAt;
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

  const warranties = computeWarrantyBatch(inputs);

  // Anexa metadata (image + purchase date) aos resultados.
  const enriched = warranties.map(w => {
    const it = items.find(i => i.id === w.orderItemId);
    const ord = orderRows.find(o => o.id === w.orderId);
    return {
      ...w,
      imageUrl: it?.imageUrl ?? null,
      purchasedAt: ord?.createdAt ? new Date(ord.createdAt) : null,
    };
  });

  // Filtra apenas com garantia (status !== 'none') e ordena: ativas primeiro, depois expira, depois expiradas.
  const list = enriched
    .filter(w => w.status !== 'none')
    .sort((a, b) => {
      const order = { active: 0, expiring_soon: 1, expired: 2, none: 3 } as const;
      return order[a.status] - order[b.status];
    });

  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 3.5vw, 36px)',
          margin: 0,
          fontWeight: 400,
          color: 'var(--text-primary)',
        }}
      >
        Garantias
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 6, marginBottom: 28, fontSize: 14 }}>
        Cobertura contra defeitos de fabricação · contada a partir da data de entrega.
      </p>

      {list.length === 0 && (
        <div style={{ padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Você ainda não tem peças com garantia ativa.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Garantias aparecem aqui automaticamente após a entrega de cada pedido.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(w => (
          <div
            key={w.orderItemId}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto auto',
              gap: 16,
              alignItems: 'center',
              background: 'var(--surface)',
              padding: 18,
              borderRadius: 8,
              border: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                aspectRatio: '1 / 1',
                background: 'var(--surface-sunken, #F4F1E9)',
                borderRadius: 4,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {w.imageUrl ? (
                <img src={w.imageUrl} alt={w.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 22, color: 'var(--text-muted)' }}>◆</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
                {w.productName}
              </div>
              {w.purchasedAt && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  comprado {fmtBRDate(w.purchasedAt)}
                </div>
              )}
            </div>
            <WarrantyStatusBadge status={w.status} daysRemaining={w.daysRemaining} />
            <a
              href="/contato"
              style={{
                padding: '8px 14px',
                fontSize: 13,
                background: 'transparent',
                border: '1px solid var(--text-primary)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {w.status === 'expired' ? 'Recomprar' : 'Acionar garantia'}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarrantyStatusBadge({
  status,
  daysRemaining,
}: {
  status: 'active' | 'expiring_soon' | 'expired' | 'none';
  daysRemaining: number | null;
}) {
  if (status === 'active') {
    return (
      <div style={{ fontSize: 12, textAlign: 'right' }}>
        <span style={{ color: 'var(--success, #5C7A4A)', fontWeight: 500 }}>● Ativa</span>
        <div style={{ color: 'var(--text-muted)' }}>
          {daysRemaining ?? 0} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
        </div>
      </div>
    );
  }
  if (status === 'expiring_soon') {
    return (
      <div style={{ fontSize: 12, textAlign: 'right' }}>
        <span style={{ color: '#B8853A', fontWeight: 500 }}>● Expira em {daysRemaining ?? 0} dias</span>
        <div style={{ color: 'var(--text-muted)' }}>renovar com a equipe</div>
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, textAlign: 'right' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>● Expirada</span>
    </div>
  );
}
