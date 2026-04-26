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
    <div className="p-8 max-w-3xl">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/products" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}>
          ← Produtos
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{product.name}</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 32 }}>{product.name}</h1>

      <ProductEditClient product={{
        id: product.id,
        name: product.name,
        description: product.description ?? '',
        seoTitle: product.seoTitle ?? '',
        seoDescription: product.seoDescription ?? '',
        priceCents: product.priceCents,
        status: product.status,
        customFields: product.customFields as Record<string, unknown>,
      }} />
    </div>
  );
}
