import { MetadataRoute } from 'next';
import { db, products } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { getHreflangAlternates } from '../lib/hreflang';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';
const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface StaticEntry {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

const STATIC_ENTRIES: StaticEntry[] = [
  { path: '/',             changeFrequency: 'daily',   priority: 1   },
  { path: '/produtos',     changeFrequency: 'daily',   priority: 0.9 },
  { path: '/sobre',        changeFrequency: 'monthly', priority: 0.5 },
  { path: '/politica',     changeFrequency: 'monthly', priority: 0.3 },
  { path: '/trocas',       changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacidade',  changeFrequency: 'monthly', priority: 0.3 },
  { path: '/termos',       changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tid = tenantId();

  const activeProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.tenantId, tid), eq(products.status, 'active')));

  const staticRoutes: MetadataRoute.Sitemap = STATIC_ENTRIES.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? BASE_URL : `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages: getHreflangAlternates(path) },
  }));

  const productRoutes: MetadataRoute.Sitemap = activeProducts.map(p => {
    const path = `/produtos/${p.slug}`;
    return {
      url: `${BASE_URL}${path}`,
      lastModified: p.updatedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: { languages: getHreflangAlternates(path) },
    };
  });

  return [...staticRoutes, ...productRoutes];
}
