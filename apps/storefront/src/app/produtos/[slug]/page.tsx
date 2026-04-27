import { notFound, redirect, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { db, products, productVariants, productImages, inventoryStock, behaviorEvents, productReviews, productRedirects } from '@lojeo/db';
import { eq, and, gte, sql, inArray, countDistinct, avg, count } from 'drizzle-orm';
import { getActiveTemplate } from '../../../template';
import { PDPClient } from './pdp-client';
import { ReviewSection } from '../../../components/reviews/review-section';
import { UgcGallery } from '../../../components/ugc/ugc-gallery';
import { FrequentlyBoughtTogether } from '../../../components/products/frequently-bought-together';
import { RecentlyViewed } from '../../../components/products/recently-viewed';
import { RelatedProducts } from '../../../components/products/related-products';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
// Telemetria real (anti-falsa-urgência):
//  - viewing: distinct anonymousId em product_view nos últimos VIEWING_WINDOW_MIN minutos, mostra se >= VIEWING_THRESHOLD
//  - low-stock: SUM(qty - reserved) das variantes deste produto, mostra se <= LOW_STOCK_THRESHOLD (e > 0)
const VIEWING_THRESHOLD = parseInt(process.env.URGENCY_THRESHOLD ?? '5', 10);
const VIEWING_WINDOW_MIN = parseInt(process.env.URGENCY_WINDOW_MIN ?? '60', 10);
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_QTY ?? '3', 10);

interface PDPProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PDPProps): Promise<Metadata> {
  const { slug } = await params;
  const tid = tenantId();
  const product = await db.query.products.findFirst({
    where: and(eq(products.tenantId, tid), eq(products.slug, slug), eq(products.status, 'active')),
  });
  if (!product) return { title: 'Produto não encontrado' };
  return {
    title: product.seoTitle ?? `${product.name} — Atelier`,
    description: product.seoDescription ?? product.description ?? undefined,
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.description ?? undefined,
    },
  };
}

export default async function PDPPage({ params }: PDPProps) {
  const { slug } = await params;
  const tid = tenantId();
  const tpl = await getActiveTemplate();

  const product = await db.query.products.findFirst({
    where: and(eq(products.tenantId, tid), eq(products.slug, slug), eq(products.status, 'active')),
  });
  if (!product) {
    const redirectRow = await db.query.productRedirects.findFirst({
      where: and(eq(productRedirects.tenantId, tid), eq(productRedirects.oldSlug, slug)),
    });
    if (redirectRow?.newSlug) {
      permanentRedirect(`/produtos/${redirectRow.newSlug}`);
    }
    if (redirectRow && !redirectRow.newSlug) {
      redirect('/produtos');
    }
    notFound();
  }

  const [variants, images] = await Promise.all([
    db.select().from(productVariants)
      .where(and(eq(productVariants.tenantId, tid), eq(productVariants.productId, product.id))),
    db.select().from(productImages)
      .where(and(eq(productImages.tenantId, tid), eq(productImages.productId, product.id)))
      .orderBy(productImages.position),
  ]);

  const variantIds = variants.map(v => v.id);
  const windowAgo = new Date(Date.now() - VIEWING_WINDOW_MIN * 60 * 1000);

  // Agregado de reviews aprovados (Stars + count no header da PDP — match jewelry-v1 ref).
  // Falha graciosa: se DB der erro, header não exibe rating.
  let reviewAvg = 0;
  let reviewTotal = 0;
  try {
    const aggResult = await db
      .select({
        avg: avg(productReviews.rating),
        total: count(productReviews.id),
      })
      .from(productReviews)
      .where(and(
        eq(productReviews.tenantId, tid),
        eq(productReviews.productId, product.id),
        eq(productReviews.status, 'approved'),
      ));
    const row = aggResult[0];
    reviewAvg = row?.avg ? Math.round(Number(row.avg) * 10) / 10 : 0;
    reviewTotal = Number(row?.total ?? 0);
  } catch (err) {
    console.warn('[PDP] review aggregate failed', err);
  }

  // Telemetria de urgência — falha graciosa: se DB der erro, badge não renderiza.
  type UrgencyKind = 'none' | 'viewing' | 'low-stock';
  let urgency: UrgencyKind = 'none';
  let viewersNow = 0;
  let totalStock = 0;

  try {
    const [viewersResult, stockResult] = await Promise.all([
      db.select({ cnt: countDistinct(behaviorEvents.anonymousId) })
        .from(behaviorEvents)
        .where(and(
          eq(behaviorEvents.tenantId, tid),
          eq(behaviorEvents.eventType, 'product_view'),
          eq(behaviorEvents.entityId, product.id),
          gte(behaviorEvents.createdAt, windowAgo),
        )),
      variantIds.length > 0
        ? db.select({
            qty: sql<number>`COALESCE(SUM(${inventoryStock.qty} - ${inventoryStock.reserved}), 0)`,
          })
            .from(inventoryStock)
            .where(and(
              eq(inventoryStock.tenantId, tid),
              inArray(inventoryStock.variantId, variantIds),
            ))
        : Promise.resolve([{ qty: 0 as number | null }]),
    ]);

    viewersNow = Number(viewersResult[0]?.cnt ?? 0);
    totalStock = Number(stockResult[0]?.qty ?? 0);

    if (totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD) urgency = 'low-stock';
    else if (viewersNow >= VIEWING_THRESHOLD) urgency = 'viewing';
  } catch (err) {
    // Modo degradado: não bloqueia a PDP por falha de telemetria
    console.warn('[PDP] urgency telemetry failed', err);
  }

  const primaryImage = images[0];
  const baseUrl = process.env.STOREFRONT_URL ?? '';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: product.slug,
    image: primaryImage?.url,
    offers: {
      '@type': 'Offer',
      priceCurrency: tpl.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/produtos/${product.slug}`,
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Produtos', item: `${baseUrl}/produtos` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${baseUrl}/produtos/${product.slug}` },
    ],
  };
  // Escape </script> to prevent premature script closing — all data comes from our own DB
  const safeJsonLd = JSON.stringify(productJsonLd).replace(/<\/script>/gi, '<\\/script>');
  const safeBreadcrumbJsonLd = JSON.stringify(breadcrumbJsonLd).replace(/<\/script>/gi, '<\\/script>');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeBreadcrumbJsonLd }} />
      <PDPClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          priceCents: product.priceCents,
          comparePriceCents: product.comparePriceCents,
          warrantyMonths: product.warrantyMonths ?? 12,
          customFields: product.customFields as Record<string, unknown>,
          seoTitle: product.seoTitle,
        }}
        variants={variants.map(v => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          priceCents: v.priceCents,
          stockQty: v.stockQty,
          optionValues: v.optionValues as Record<string, unknown>,
        }))}
        images={images.map(img => ({
          id: img.id,
          url: img.url,
          altText: img.altText,
          position: img.position,
        }))}
        urgency={urgency}
        viewersNow={viewersNow}
        totalStock={totalStock}
        currency={tpl.currency}
        reviewAvg={reviewAvg}
        reviewTotal={reviewTotal}
      />
      <div
        data-product-id={product.id}
        data-product-name={product.name}
        style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '0 var(--container-pad) 80px' }}
      >
        <FrequentlyBoughtTogether productId={product.id} />
        <RelatedProducts productId={product.id} />
        <UgcGallery productId={product.id} />
        <RecentlyViewed currentProductId={product.id} />
        <ReviewSection productId={product.id} />
      </div>
    </>
  );
}
