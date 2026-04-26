import Link from 'next/link';
import { db, orders, orderItems, productVariants, products, productCollections } from '@lojeo/db';
import { eq, and, inArray, ne, desc, sql } from 'drizzle-orm';
import { auth } from '../../auth';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
}

/**
 * RecommendedForYou — server component homepage personalization
 *
 * Cliente logado com pedidos:
 *   1. Identifica coleções dos produtos já comprados
 *   2. Sugere produtos NÃO comprados das mesmas coleções
 *   3. Top 4 ordenados por created_at DESC (novidades das categorias afins)
 *
 * Anônimo ou sem pedidos: retorna null (homepage exibe "Recém-criadas" default)
 *
 * Modo degradado: try/catch em cada step → null se DB falhar
 */
export async function RecommendedForYou(): Promise<Suggestion[] | null> {
  let email: string | undefined;
  try {
    const session = await auth();
    email = session?.user?.email?.toLowerCase();
  } catch {
    return null;
  }
  if (!email) return null;

  try {
    // Pedidos pagos do cliente últimos 365d
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const customerOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(
        eq(orders.tenantId, TENANT_ID),
        eq(orders.customerEmail, email),
        inArray(orders.status, ['paid', 'preparing', 'shipped', 'delivered']),
        sql`${orders.createdAt} >= ${since}`,
      ))
      .limit(50);

    if (customerOrders.length === 0) return null;

    const orderIds = customerOrders.map(o => o.id);

    // Produtos já comprados (via order_items.variantId → product_variants.productId)
    const purchasedItems = await db
      .select({ productId: productVariants.productId })
      .from(orderItems)
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .where(inArray(orderItems.orderId, orderIds));

    const purchasedIds = new Set(purchasedItems.map(p => p.productId).filter((id): id is string => Boolean(id)));
    if (purchasedIds.size === 0) return null;

    // Coleções dos produtos comprados
    const collectionsRows = await db
      .select({ collectionId: productCollections.collectionId })
      .from(productCollections)
      .where(inArray(productCollections.productId, Array.from(purchasedIds)));

    const collectionIds = Array.from(new Set(collectionsRows.map(c => c.collectionId)));
    if (collectionIds.length === 0) return null;

    // Candidatos: produtos das mesmas coleções, exceto já comprados
    const candidatesRows = await db
      .select({ productId: productCollections.productId })
      .from(productCollections)
      .where(inArray(productCollections.collectionId, collectionIds));

    const candidateIds = Array.from(new Set(
      candidatesRows
        .map(r => r.productId)
        .filter(id => !purchasedIds.has(id)),
    ));

    if (candidateIds.length === 0) return null;

    // Resolve product detail, ordena por created_at DESC, limita 4
    const suggestions = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        inArray(products.id, candidateIds),
        ne(products.id, ''),
      ))
      .orderBy(desc(products.createdAt))
      .limit(4);

    return suggestions.length > 0 ? suggestions : null;
  } catch {
    // Modo degradado: falha silenciosa, homepage mostra default
    return null;
  }
}

interface Props {
  currency: string;
}

export async function RecommendedForYouSection({ currency }: Props) {
  const suggestions = await RecommendedForYou();
  if (!suggestions || suggestions.length === 0) return null;

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Para você</p>
          <h2 style={{ margin: 0 }}>Combinam com seu estilo</h2>
        </div>
        <Link href="/produtos" style={{ fontSize: 14, borderBottom: '1px solid var(--text-primary)', paddingBottom: 2, color: 'var(--text-primary)' }}>
          ver mais
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {suggestions.map(p => (
          <Link
            key={p.id}
            href={`/produtos/${p.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              aspectRatio: '3/4',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--r-image)',
              marginBottom: 12,
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{
                width: '60%', height: '60%',
                background: 'linear-gradient(135deg, #D4C5A8 0%, #B8956A22 100%)',
                borderRadius: '50%',
              }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, margin: '0 0 4px' }}>{p.name}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{formatPrice(p.priceCents)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
