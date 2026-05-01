import { db, products, productVariants, productImages, productCollections, collections } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductEditClient } from './product-edit-client';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = tenantId();

  const [product, variants, images, productCols, allCols] = await Promise.all([
    db.select().from(products).where(and(eq(products.id, id), eq(products.tenantId, tid))).limit(1).then((r) => r[0]),
    db.select().from(productVariants).where(and(eq(productVariants.productId, id), eq(productVariants.tenantId, tid))),
    db.select().from(productImages).where(and(eq(productImages.productId, id), eq(productImages.tenantId, tid))).orderBy(asc(productImages.position)),
    db.select({ id: collections.id, name: collections.name, slug: collections.slug })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(and(eq(productCollections.productId, id), eq(collections.tenantId, tid))),
    db.select({ id: collections.id, name: collections.name, slug: collections.slug })
      .from(collections)
      .where(eq(collections.tenantId, tid)),
  ]);

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
          slug: product.slug,
          description: product.description ?? '',
          sku: product.sku ?? '',
          status: product.status,
          priceCents: product.priceCents,
          comparePriceCents: product.comparePriceCents ?? null,
          costCents: product.costCents ?? null,
          ncm: product.ncm ?? '',
          taxRegime: product.taxRegime ?? '',
          warrantyMonths: product.warrantyMonths ?? 12,
          returnDays: product.returnDays ?? null,
          nonReturnable: product.nonReturnable,
          exportRestrictions: product.exportRestrictions as Record<string, unknown>,
          presaleShipDate: product.presaleShipDate?.toISOString() ?? null,
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
          customFields: product.customFields as Record<string, unknown>,
        }}
        initialVariants={variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name ?? '',
          optionValues: v.optionValues as Record<string, string>,
          priceCents: v.priceCents ?? null,
          stockQty: v.stockQty,
          barcode: v.barcode ?? '',
        }))}
        initialImages={images.map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText ?? null,
          position: img.position,
        }))}
        initialProductCollections={productCols}
        allCollections={allCols}
        removeBgEnabled={!!process.env.REMOVE_BG_KEY}
      />
    </div>
  );
}
