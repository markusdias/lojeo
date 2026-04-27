import { auth } from '../../../auth';
import { db, orders, orderItems, products } from '@lojeo/db';
import { eq, and, desc, or, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RebuySuggestion } from '../../../components/account/rebuy-suggestion';
import { StatusPill } from '../../../components/account/status-pill';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

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

  // Buscar produtos por nome para resolver warrantyMonths (sugestão de recompra)
  const productNames = Array.from(new Set(items.map(i => i.productName)));
  const productLookup = productNames.length > 0
    ? await db.select({ productName: products.name, warrantyMonths: products.warrantyMonths })
        .from(products)
        .where(and(eq(products.tenantId, tid), inArray(products.name, productNames)))
    : [];

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>{order.orderNumber}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <StatusPill status={order.status} />
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{fmt(order.totalCents)}</p>
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

      {rows.length > 0 && (
        <RebuySuggestion
          orders={rows.map(o => ({
            id: o.id,
            status: o.status,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt,
          }))}
          items={items.map(i => ({
            orderId: i.orderId,
            productName: i.productName,
            sku: i.sku,
            variantId: i.variantId,
          }))}
          products={productLookup.map(p => ({
            productName: p.productName,
            warrantyMonths: p.warrantyMonths,
          }))}
        />
      )}
    </div>
  );
}
