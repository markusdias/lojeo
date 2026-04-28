import Link from 'next/link';
import { db, behaviorEvents, products, orders, orderItems, productVariants } from '@lojeo/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { auth } from '../../auth';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface ResumeProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
}

/**
 * ContinueWhereLeftOff — server component homepage personalization
 *
 * "Continue de onde parou" para cliente logado recorrente:
 *   1. Busca último product_view do userId (behaviorEvents) últimos 30d
 *   2. Exclui produtos já comprados (não faz sentido sugerir recompra aqui —
 *      isso é trabalho do RebuySuggestion em /conta/pedidos)
 *   3. Renderiza um card-banner único linkando para a PDP
 *
 * Anônimo, sem histórico ou produto inativo: retorna null.
 * Modo degradado: try/catch retorna null silencioso.
 */
async function getLastViewedProduct(): Promise<ResumeProduct | null> {
  let email: string | undefined;
  try {
    const session = await auth();
    email = session?.user?.email?.toLowerCase();
  } catch {
    return null;
  }
  if (!email) return null;

  try {
    // Resolve userId pelo email (orders já tem customerEmail, mas behavior_events
    // só tem userId — precisamos pegar via orders para ser consistente com sessão)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Pedidos do cliente para excluir produtos já comprados
    const customerOrders = await db
      .select({ id: orders.id, userId: orders.userId })
      .from(orders)
      .where(and(
        eq(orders.tenantId, TENANT_ID),
        eq(orders.customerEmail, email),
      ))
      .limit(50);

    const userId = customerOrders.find(o => o.userId)?.userId ?? null;
    if (!userId) return null;

    const purchasedSet = new Set<string>();
    if (customerOrders.length > 0) {
      const orderIds = customerOrders.map(o => o.id);
      const purchasedItems = await db
        .select({ productId: productVariants.productId })
        .from(orderItems)
        .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
        .where(inArray(orderItems.orderId, orderIds));
      for (const p of purchasedItems) {
        if (p.productId) purchasedSet.add(p.productId);
      }
    }

    // Último product_view do userId (limit 10 para conseguir filtrar comprados)
    const lastViews = await db
      .select({
        entityId: behaviorEvents.entityId,
        createdAt: behaviorEvents.createdAt,
      })
      .from(behaviorEvents)
      .where(and(
        eq(behaviorEvents.tenantId, TENANT_ID),
        eq(behaviorEvents.userId, userId),
        eq(behaviorEvents.eventType, 'product_view'),
        sql`${behaviorEvents.createdAt} >= ${since}`,
        sql`${behaviorEvents.entityId} IS NOT NULL`,
      ))
      .orderBy(desc(behaviorEvents.createdAt))
      .limit(10);

    const candidate = lastViews.find(v => v.entityId && !purchasedSet.has(v.entityId));
    if (!candidate?.entityId) return null;

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(and(
        eq(products.tenantId, TENANT_ID),
        eq(products.id, candidate.entityId),
        eq(products.status, 'active'),
      ))
      .limit(1);

    return product ?? null;
  } catch {
    return null;
  }
}

interface Props {
  currency: string;
}

export async function ContinueWhereLeftOffSection({ currency }: Props) {
  const product = await getLastViewedProduct();
  if (!product) return null;

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
      <Link
        href={`/produtos/${product.slug}`}
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr auto',
          alignItems: 'center',
          gap: 32,
          padding: '32px',
          borderRadius: 'var(--r-image)',
          background: 'var(--surface-sunken)',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div data-product-image style={{
          aspectRatio: '3/4',
          borderRadius: 'var(--r-image)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
        </div>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Continue de onde parou</p>
          <h3 style={{ margin: '0 0 6px', fontSize: 22 }}>{product.name}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Você visualizou recentemente — {formatPrice(product.priceCents)}
          </p>
        </div>
        <span style={{
          fontSize: 14,
          borderBottom: '1px solid var(--text-primary)',
          paddingBottom: 2,
          color: 'var(--text-primary)',
        }}>
          Ver peça
        </span>
      </Link>
    </section>
  );
}
