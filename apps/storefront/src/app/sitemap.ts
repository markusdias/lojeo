import { MetadataRoute } from 'next';
import { db, products } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';
const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tid = tenantId();

  const activeProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.tenantId, tid), eq(products.status, 'active')));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/produtos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/sobre`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/politica`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/trocas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacidade`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = activeProducts.map(p => ({
    url: `${BASE_URL}/produtos/${p.slug}`,
    lastModified: p.updatedAt ?? new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
