import { db, products } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductEditClient } from './product-edit-client';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId())))
    .limit(1)
    .then((r) => r[0]);

  if (!product) notFound();

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <Link href="/produtos" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Produtos
      </Link>

      <header style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          {product.name}
        </h1>
        <p className="caption mono">{product.id.slice(0, 8)}</p>
      </header>

      <ProductEditClient
        product={{
          id: product.id,
          name: product.name,
          description: product.description ?? '',
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
          priceCents: product.priceCents,
          status: product.status,
          customFields: product.customFields as Record<string, unknown>,
        }}
        removeBgEnabled={!!process.env.REMOVE_BG_KEY}
      />
    </div>
  );
}
