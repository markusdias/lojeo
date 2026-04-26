import { db, products } from '@lojeo/db';
import { and, eq, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RecommendationsClient } from './recommendations-client';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function ProductRecommendationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tid = tenantId();

  const product = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tid)))
    .limit(1)
    .then((r) => r[0]);

  if (!product) notFound();

  // Catálogo (excluindo o próprio produto) — usado no autocomplete client-side
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
    })
    .from(products)
    .where(and(eq(products.tenantId, tid), ne(products.id, id)))
    .limit(500);

  return (
    <div className="p-8 max-w-3xl">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/products" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}>
          ← Produtos
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <Link
          href={`/products/${product.id}`}
          style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}
        >
          {product.name}
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>Recomendações</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
        Recomendações de {product.name}
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
        Force produtos no topo (pin) ou bloqueie (exclude) das recomendações desta PDP. O algoritmo
        FBT continua rodando — overrides apenas o ajustam.
      </p>

      <RecommendationsClient productId={product.id} catalog={catalog} />
    </div>
  );
}
