import { MetadataRoute } from 'next';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tid = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  let customRobots: string | undefined;
  try {
    const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, tid) });
    const config = (tenant?.config ?? {}) as { robotsTxt?: string };
    customRobots = config.robotsTxt;
  } catch {}

  if (customRobots) {
    // Custom robots.txt: return raw (Next.js will use our default rules, but we override via headers)
    // Since MetadataRoute.Robots doesn't support raw string, fall through to default with a note
    // Full custom robots via /api/robots route would be needed for raw control
    // For now: if custom is set, attempt to parse the most common patterns
    const disallowLines = [...customRobots.matchAll(/^Disallow:\s*(.+)$/gm)].map(m => m[1]?.trim() ?? '').filter(Boolean);
    const allowLines = [...customRobots.matchAll(/^Allow:\s*(.+)$/gm)].map(m => m[1]?.trim() ?? '').filter(Boolean);
    return {
      rules: [{ userAgent: '*', allow: allowLines.length ? allowLines : '/', disallow: disallowLines }],
      sitemap: `${BASE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/carrinho', '/conta/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
